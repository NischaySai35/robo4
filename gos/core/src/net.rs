//! The TCP wire for `gos.transport.TcpTransport` (G10 step 2): sockets, batching and hub forwarding in Rust.
//! The message rules (latched values, services, discovery) stay in Python; this only moves lines.
//!
//! Wire format, unchanged from the Python wire so both kinds of program talk to each other: one JSON object
//! per line. The first program to open the address is the hub; it passes every `pub` line straight on to the
//! other programs here, without waking Python. Writes go through one writer thread per connection, so a
//! burst of messages leaves in a few system calls instead of one each.
//!
//! Binary frames (G10 step 3) carry bytes and arrays without turning them into text: a header line
//! `#<n> {json}` followed by exactly n raw bytes. The JSON is the same frame a text line would hold.
//!
//! Peers: on a hub, every connected program gets an id from 1 up. On a program that connected to a hub,
//! the hub is peer 0. `BROADCAST` sends to every peer.
// REUSE-CHECKED: no socket code in gos/core before this; the Python wire (TcpTransport._PyWire) stays as the fallback.

use std::collections::{HashMap, VecDeque};
use std::io::{BufRead, BufReader, Write};
use std::net::{Shutdown, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Condvar, Mutex, OnceLock};
use std::time::{Duration, Instant};

pub const BROADCAST: u32 = u32::MAX;
pub const LINE: u8 = 0;
pub const JOINED: u8 = 1;
pub const LEFT: u8 = 2;
/// A binary frame: delivered as the header's JSON, a newline, then the raw bytes.
pub const FRAME: u8 = 3;
/// The largest binary frame accepted; a bigger header means a broken or hostile sender, and the connection is closed.
const MAX_FRAME: usize = 1 << 30;

struct Out {
    buf: Vec<u8>,
    closed: bool,
    /// A write is on the socket now (the writer thread's, or one sent straight from `push`).
    writing: bool,
    last: Instant,
}

/// A line that comes after this much quiet is written at once by the caller: the lowest delay for single messages
/// (commands, replies). Lines that come faster than that queue up, and the writer thread sends them together.
const QUIET: Duration = Duration::from_micros(50);

struct Peer {
    sock: TcpStream,
    out: Mutex<Out>,
    ready: Condvar,
}

impl Peer {
    /// Queue bytes exactly as given (the caller ends lines with a newline). A lone write after a quiet spell
    /// goes straight to the socket; otherwise the writer thread sends everything queued together.
    fn push(&self, parts: &[&[u8]]) {
        let mut o = self.out.lock().unwrap();
        if o.closed { return; }
        if !o.writing && o.buf.is_empty() && o.last.elapsed() >= QUIET {
            o.writing = true;
            drop(o);
            let ok = if parts.len() == 1 {
                (&self.sock).write_all(parts[0]).is_ok()
            } else {
                let mut one = Vec::with_capacity(parts.iter().map(|p| p.len()).sum());
                for p in parts { one.extend_from_slice(p); }
                (&self.sock).write_all(&one).is_ok()
            };
            let mut o = self.out.lock().unwrap();
            o.writing = false;
            o.last = Instant::now();
            if !ok { o.closed = true; }
            let more = !o.buf.is_empty() || o.closed;
            drop(o);
            if more { self.ready.notify_all(); }
            return;
        }
        let was_empty = o.buf.is_empty();
        for p in parts { o.buf.extend_from_slice(p); }
        let idle = !o.writing;
        drop(o);
        if was_empty && idle { self.ready.notify_all(); }
    }

    fn push_line(&self, line: &[u8]) {
        if line.last() == Some(&b'\n') { self.push(&[line]) } else { self.push(&[line, b"\n"]) }
    }

    fn close(&self) {
        self.out.lock().unwrap().closed = true;
        self.ready.notify_all();
        let _ = self.sock.shutdown(Shutdown::Both);
    }
}

pub struct Net {
    pub hub: bool,
    peers: Mutex<HashMap<u32, Arc<Peer>>>,
    inbox: Mutex<VecDeque<(u32, u8, Vec<u8>)>>,
    arrived: Condvar,
    next: AtomicU32,
    closed: AtomicBool,
    listen_at: Option<SocketAddr>,
    /// Lines the hub passed on without Python, for tests and the bench.
    pub forwarded: AtomicU32,
}

/// Every message line the hub must pass on: Python writes `{"op": "pub", ...` (op first, as dicts keep order).
fn is_pub(line: &[u8]) -> bool {
    if line.starts_with(b"{\"op\": \"pub\"") || line.starts_with(b"{\"op\":\"pub\"") { return true; }
    #[derive(serde::Deserialize)]
    struct Op<'a> { #[serde(borrow)] op: std::borrow::Cow<'a, str> }
    serde_json::from_slice::<Op>(line).map(|o| o.op == "pub").unwrap_or(false)
}

impl Net {
    /// Take the address as the hub, or connect to the program that holds it.
    pub fn open(address: &str) -> Result<Arc<Net>, String> {
        let addr: SocketAddr = address.parse().map_err(|e| format!("The address {address} isn't host:port ({e})."))?;
        let make = |hub, listen_at| Arc::new(Net {
            hub, peers: Mutex::new(HashMap::new()), inbox: Mutex::new(VecDeque::new()), arrived: Condvar::new(),
            next: AtomicU32::new(1), closed: AtomicBool::new(false), listen_at, forwarded: AtomicU32::new(0),
        });
        // Like the Python wire: Rust sets SO_REUSEADDR on Linux and macOS (a restarted hub takes its port back) and not
        // on Windows (where it would let a second program share the port).
        match TcpListener::bind(addr) {
            Ok(listener) => {
                let net = make(true, listener.local_addr().ok());
                let n = net.clone();
                std::thread::Builder::new().name("gos-accept".into()).spawn(move || n.accept(listener)).map_err(|e| e.to_string())?;
                Ok(net)
            }
            Err(_) => {
                let sock = TcpStream::connect_timeout(&addr, Duration::from_secs(5))
                    .map_err(|e| format!("Could not open or reach {address}: {e}."))?;
                let net = make(false, None);
                net.add(0, sock)?;
                Ok(net)
            }
        }
    }

    fn accept(self: Arc<Self>, listener: TcpListener) {
        for sock in listener.incoming() {
            if self.closed.load(Ordering::SeqCst) { return; }
            let Ok(sock) = sock else { continue };
            let id = self.next.fetch_add(1, Ordering::SeqCst);
            let _ = self.add(id, sock);
        }
    }

    fn add(self: &Arc<Self>, id: u32, sock: TcpStream) -> Result<(), String> {
        let _ = sock.set_nodelay(true);  // the writer already batches; never let the OS hold a line back
        let read = sock.try_clone().map_err(|e| e.to_string())?;
        let write = sock.try_clone().map_err(|e| e.to_string())?;
        let peer = Arc::new(Peer { sock, out: Mutex::new(Out { buf: Vec::with_capacity(1 << 16), closed: false, writing: false, last: Instant::now() }), ready: Condvar::new() });
        self.peers.lock().unwrap().insert(id, peer.clone());
        self.deliver(id, JOINED, Vec::new());
        let p = peer.clone();
        std::thread::Builder::new().name(format!("gos-write-{id}")).spawn(move || writer(p, write)).map_err(|e| e.to_string())?;
        let n = self.clone();
        std::thread::Builder::new().name(format!("gos-read-{id}")).spawn(move || n.reader(id, read)).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn reader(self: Arc<Self>, id: u32, sock: TcpStream) {
        let mut r = BufReader::with_capacity(1 << 16, sock);
        let mut line = Vec::with_capacity(512);
        loop {
            line.clear();
            match r.read_until(b'\n', &mut line) {
                Ok(0) | Err(_) => break,  // closed, or reset by a program that was killed
                Ok(_) => {}
            }
            if line.last() == Some(&b'\n') { line.pop(); }
            if line.is_empty() { continue; }
            if line[0] == b'#' {
                // a binary frame: "#<n> {json}", then n raw bytes
                let Some(sp) = line.iter().position(|&c| c == b' ') else { break };
                let Some(n) = std::str::from_utf8(&line[1..sp]).ok().and_then(|t| t.parse::<usize>().ok()) else { break };
                if n > MAX_FRAME { break; }
                let mut payload = vec![0u8; n];
                if std::io::Read::read_exact(&mut r, &mut payload).is_err() { break; }
                let json = &line[sp + 1..];
                if self.hub && is_pub(json) {
                    for (&other, q) in self.peers.lock().unwrap().iter() {
                        if other != id { q.push(&[&line, b"\n", &payload]); }
                    }
                    self.forwarded.fetch_add(1, Ordering::Relaxed);
                }
                let mut data = Vec::with_capacity(json.len() + 1 + n);
                data.extend_from_slice(json);
                data.push(b'\n');
                data.extend_from_slice(&payload);
                self.deliver(id, FRAME, data);
                continue;
            }
            if self.hub && is_pub(&line) {
                for (&other, q) in self.peers.lock().unwrap().iter() {
                    if other != id { q.push_line(&line); }
                }
                self.forwarded.fetch_add(1, Ordering::Relaxed);
            }
            self.deliver(id, LINE, line.clone());
        }
        if let Some(p) = self.peers.lock().unwrap().remove(&id) { p.close(); }
        self.deliver(id, LEFT, Vec::new());
    }

    fn deliver(&self, id: u32, kind: u8, data: Vec<u8>) {
        let mut q = self.inbox.lock().unwrap();
        let was_empty = q.is_empty();
        q.push_back((id, kind, data));
        drop(q);
        if was_empty { self.arrived.notify_all(); }
    }

    /// Queue one line for a peer, or for every peer. Never blocks on the network.
    pub fn send(&self, to: u32, line: &[u8]) -> bool { self.each(to, |p| p.push_line(line)) }

    /// Queue one binary frame: `json` is the frame's JSON, `payload` its raw bytes.
    pub fn send_frame(&self, to: u32, json: &[u8], payload: &[u8]) -> bool {
        let head = format!("#{} ", payload.len());
        self.each(to, |p| p.push(&[head.as_bytes(), json, b"\n", payload]))
    }

    fn each(&self, to: u32, f: impl Fn(&Peer)) -> bool {
        let peers = self.peers.lock().unwrap();
        if to == BROADCAST {
            for p in peers.values() { f(p); }
            true
        } else if let Some(p) = peers.get(&to) {
            f(p);
            true
        } else {
            false
        }
    }

    /// Everything that arrived, waiting up to `timeout` for the first item. Empty after `close`.
    pub fn recv(&self, timeout: Duration) -> Option<Vec<(u32, u8, Vec<u8>)>> {
        let end = Instant::now() + timeout;
        // Measured: spinning here before sleeping did not shorten the there-and-back time and made the slowest 1 % worse.
        let mut q = self.inbox.lock().unwrap();
        while q.is_empty() {
            if self.closed.load(Ordering::SeqCst) { return None; }
            let now = Instant::now();
            if now >= end { return Some(Vec::new()); }
            q = self.arrived.wait_timeout(q, end - now).unwrap().0;
        }
        Some(q.drain(..).collect())
    }

    pub fn close(&self) {
        if self.closed.swap(true, Ordering::SeqCst) { return; }
        for p in self.peers.lock().unwrap().drain().map(|(_, p)| p) { p.close(); }
        if let Some(mut a) = self.listen_at {
            // wake the accept loop so it sees `closed`
            if a.ip().is_unspecified() { a.set_ip(if a.is_ipv4() { [127, 0, 0, 1].into() } else { std::net::Ipv6Addr::LOCALHOST.into() }); }
            let _ = TcpStream::connect_timeout(&a, Duration::from_millis(200));
        }
        self.arrived.notify_all();
    }
}

/// One writer per connection: takes everything queued so far and writes it in one go.
fn writer(p: Arc<Peer>, mut sock: TcpStream) {
    let mut spare = Vec::with_capacity(1 << 16);
    loop {
        {
            let mut o = p.out.lock().unwrap();
            while (o.buf.is_empty() || o.writing) && !o.closed { o = p.ready.wait(o).unwrap(); }
            if o.closed { return; }
            std::mem::swap(&mut o.buf, &mut spare);
            o.writing = true;
        }
        let ok = sock.write_all(&spare).is_ok();
        spare.clear();
        if spare.capacity() > 1 << 22 { spare.shrink_to(1 << 16); }  // don't keep a huge buffer after one big message
        let mut o = p.out.lock().unwrap();
        o.writing = false;
        o.last = Instant::now();
        if !ok { o.closed = true; drop(o); p.close(); return; }
    }
}

// ── handles for the C interface ──

fn table() -> &'static Mutex<HashMap<u32, Arc<Net>>> {
    static T: OnceLock<Mutex<HashMap<u32, Arc<Net>>>> = OnceLock::new();
    T.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn register(net: Arc<Net>) -> u32 {
    static NEXT: AtomicU32 = AtomicU32::new(1);
    let h = NEXT.fetch_add(1, Ordering::SeqCst);
    table().lock().unwrap().insert(h, net);
    h
}

pub fn get(h: u32) -> Option<Arc<Net>> { table().lock().unwrap().get(&h).cloned() }

pub fn forget(h: u32) -> Option<Arc<Net>> { table().lock().unwrap().remove(&h) }

#[cfg(test)]
mod tests {
    use super::*;

    /// The next `count` lines, in order.
    fn lines(n: &Net, count: usize) -> Vec<(u32, Vec<u8>)> {
        let mut got = Vec::new();
        let end = Instant::now() + Duration::from_secs(5);
        while Instant::now() < end {
            for (id, kind, data) in n.recv(Duration::from_millis(100)).unwrap() {
                if kind == LINE { got.push((id, data)); }
            }
            if got.len() >= count { return got; }
        }
        panic!("only {} of {count} lines arrived", got.len());
    }

    #[test]
    fn hub_passes_pub_lines_on_and_keeps_order() {
        let hub = Net::open("127.0.0.1:17531").unwrap();
        assert!(hub.hub);
        let a = Net::open("127.0.0.1:17531").unwrap();
        let b = Net::open("127.0.0.1:17531").unwrap();
        assert!(!a.hub && !b.hub);
        std::thread::sleep(Duration::from_millis(100));
        for i in 0..1000 { a.send(0, format!("{{\"op\": \"pub\", \"t\": \"/x\", \"m\": {{\"j\": {i}}}}}").as_bytes()); }
        a.send(0, b"{\"op\": \"serve\", \"n\": \"/s\"}");
        for (seen, (id, line)) in lines(&b, 1000).into_iter().enumerate() {
            assert_eq!(id, 0);
            let s = String::from_utf8(line).unwrap();
            assert!(s.contains(&format!("\"j\": {seen}}}")), "line {seen}: {s}");
        }
        // the hub's own Python still sees everything, the serve line included; b never gets the serve line
        assert_eq!(lines(&hub, 1001).len(), 1001);
        assert_eq!(hub.forwarded.load(Ordering::Relaxed), 1000);
        assert!(b.recv(Duration::from_millis(200)).unwrap().iter().all(|(_, k, _)| *k != LINE));
        for n in [&a, &b, &hub] { n.close(); }
    }

    #[test]
    fn binary_frames_pass_through_untouched_between_lines() {
        let hub = Net::open("127.0.0.1:17533").unwrap();
        let a = Net::open("127.0.0.1:17533").unwrap();
        let b = Net::open("127.0.0.1:17533").unwrap();
        std::thread::sleep(Duration::from_millis(100));
        let payload: Vec<u8> = (0..300_000u32).map(|i| (i % 251) as u8).collect();  // has newlines in it
        a.send(0, br#"{"op": "pub", "t": "/x", "m": {"j": 1}}"#);
        a.send_frame(0, br#"{"op": "pub", "t": "/x", "m": {"bin": "b"}}"#, &payload);
        a.send(0, br#"{"op": "pub", "t": "/x", "m": {"j": 2}}"#);
        let mut got = Vec::new();
        let end = Instant::now() + Duration::from_secs(5);
        while got.len() < 3 && Instant::now() < end {
            for (_, kind, data) in b.recv(Duration::from_millis(100)).unwrap() { if kind == LINE || kind == FRAME { got.push((kind, data)); } }
        }
        assert_eq!(got.len(), 3);
        assert_eq!(got[0].0, LINE);
        assert_eq!(got[1].0, FRAME);
        let cut = got[1].1.iter().position(|&c| c == b'\n').unwrap();
        assert_eq!(&got[1].1[..cut], br#"{"op": "pub", "t": "/x", "m": {"bin": "b"}}"#);
        assert_eq!(&got[1].1[cut + 1..], &payload[..]);
        assert!(String::from_utf8_lossy(&got[2].1).contains(r#""j": 2"#));
        for n in [&a, &b, &hub] { n.close(); }
    }

    #[test]
    fn a_program_that_stops_is_reported_gone() {
        let hub = Net::open("127.0.0.1:17532").unwrap();
        let a = Net::open("127.0.0.1:17532").unwrap();
        let mut joined = None;
        for _ in 0..20 {
            for (id, kind, _) in hub.recv(Duration::from_millis(100)).unwrap() { if kind == JOINED { joined = Some(id); } }
            if joined.is_some() { break; }
        }
        let id = joined.expect("joined");
        a.close();
        let mut left = false;
        for _ in 0..20 {
            for (i, kind, _) in hub.recv(Duration::from_millis(100)).unwrap() { if kind == LEFT && i == id { left = true; } }
            if left { break; }
        }
        assert!(left);
        hub.close();
        assert!(hub.recv(Duration::from_millis(10)).is_none());
    }
}
