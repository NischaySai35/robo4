//! rt-telemetry — stream RT Core telemetry (controller status JSON) to the Studio over
//! WebSocket, without touching the real-time control thread.
//!
//! The control loop only calls `Broadcaster::publish` (non-blocking, lock-light). A
//! separate server thread accepts WebSocket clients (the browser RT Core tab) and forwards
//! each broadcast message to them. Network I/O therefore never runs on the RT thread.
//!
//! `Broadcaster` is unit-tested without sockets; `TelemetryServer` is covered by an
//! integration test that connects a real client over a loopback port.

use std::io::ErrorKind;
use std::net::TcpListener;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

/// Fans out String messages to all current subscribers. Cloneable shared handle.
#[derive(Clone, Default)]
pub struct Broadcaster {
    clients: Arc<Mutex<Vec<Sender<String>>>>,
}

impl Broadcaster {
    pub fn new() -> Self {
        Broadcaster { clients: Arc::new(Mutex::new(Vec::new())) }
    }

    /// Register a subscriber; returns the receiving end the server forwards to a socket.
    pub fn subscribe(&self) -> Receiver<String> {
        let (tx, rx) = channel();
        self.clients.lock().unwrap().push(tx);
        rx
    }

    /// Send `msg` to every subscriber, pruning any that have disconnected.
    /// Non-blocking and safe to call from the control loop.
    pub fn publish(&self, msg: &str) {
        let mut clients = self.clients.lock().unwrap();
        clients.retain(|tx| tx.send(msg.to_string()).is_ok());
    }

    pub fn client_count(&self) -> usize {
        self.clients.lock().unwrap().len()
    }
}

/// A running WebSocket telemetry server (bidirectional). Hold it for the program's
/// lifetime: `publish` streams telemetry OUT to clients; `try_recv` drains commands the
/// clients sent IN (e.g. the Studio sending a trajectory or e-stop).
pub struct TelemetryServer {
    pub broadcaster: Broadcaster,
    pub addr: std::net::SocketAddr,
    inbound_rx: Receiver<String>,
}

impl TelemetryServer {
    /// Bind `addr` (e.g. "127.0.0.1:8088" or ":0" for an OS-chosen port) and start serving.
    pub fn start(addr: &str) -> std::io::Result<TelemetryServer> {
        let listener = TcpListener::bind(addr)?;
        let local = listener.local_addr()?;
        let broadcaster = Broadcaster::new();
        let b = broadcaster.clone();
        let (inbound_tx, inbound_rx) = channel::<String>();

        thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(stream) = stream else { continue };
                // subscribe BEFORE the handshake so no message is missed once connected
                let rx = b.subscribe();
                let in_tx = inbound_tx.clone();
                thread::spawn(move || serve_client(stream, rx, in_tx));
            }
        });

        Ok(TelemetryServer { broadcaster, addr: local, inbound_rx })
    }

    /// Send a telemetry message OUT to all connected clients.
    pub fn publish(&self, msg: &str) {
        self.broadcaster.publish(msg);
    }

    /// Drain the next command a client sent IN (non-blocking; None if nothing pending).
    pub fn try_recv(&self) -> Option<String> {
        self.inbound_rx.try_recv().ok()
    }

    pub fn client_count(&self) -> usize {
        self.broadcaster.client_count()
    }
}

/// Per-connection loop: forwards broadcast telemetry to the client and reads client
/// commands into `inbound`. A short read timeout lets one thread do both directions.
fn serve_client(stream: std::net::TcpStream, rx: Receiver<String>, inbound: Sender<String>) {
    let Ok(mut ws) = tungstenite::accept(stream) else { return };
    // read timeout so ws.read() returns periodically and we can also write outbound
    let _ = ws.get_ref().set_read_timeout(Some(Duration::from_millis(20)));
    loop {
        // OUT: drain any pending telemetry to this client
        while let Ok(msg) = rx.try_recv() {
            if ws.send(tungstenite::Message::Text(msg.into())).is_err() {
                return;
            }
        }
        let _ = ws.flush();
        // IN: read one client message (or time out and loop)
        match ws.read() {
            Ok(tungstenite::Message::Text(t)) => {
                if inbound.send(t.to_string()).is_err() {
                    return;
                }
            }
            Ok(tungstenite::Message::Close(_)) => return,
            Ok(_) => {}
            Err(tungstenite::Error::Io(e))
                if matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {}
            Err(_) => return,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn broadcasts_to_all_and_prunes_dropped() {
        let b = Broadcaster::new();
        let r1 = b.subscribe();
        let r2 = b.subscribe();
        assert_eq!(b.client_count(), 2);

        b.publish("x");
        assert_eq!(r1.recv().unwrap(), "x");
        assert_eq!(r2.recv().unwrap(), "x");

        drop(r1);
        b.publish("y"); // prunes the dropped receiver
        assert_eq!(b.client_count(), 1);
        assert_eq!(r2.recv().unwrap(), "y");
    }

    #[test]
    fn websocket_client_receives_published_telemetry() {
        let server = TelemetryServer::start("127.0.0.1:0").expect("bind");
        let url = format!("ws://{}/", server.addr);
        let (mut ws, _resp) = tungstenite::connect(&url).expect("connect");

        // wait until the server-side connection has subscribed
        for _ in 0..200 {
            if server.client_count() >= 1 {
                break;
            }
            thread::sleep(Duration::from_millis(5));
        }
        assert!(server.client_count() >= 1, "client should be registered");

        server.publish(r#"{"format":"rtcore.controller_status","fraction":0.5}"#);
        let msg = ws.read().expect("read");
        assert!(msg.to_text().unwrap().contains("rtcore.controller_status"));
    }

    #[test]
    fn server_receives_commands_sent_by_a_client() {
        let server = TelemetryServer::start("127.0.0.1:0").expect("bind");
        let url = format!("ws://{}/", server.addr);
        let (mut ws, _resp) = tungstenite::connect(&url).expect("connect");

        ws.send(tungstenite::Message::Text(r#"{"format":"rtcore.command","cmd":"estop","trip":true}"#.into())).unwrap();
        ws.flush().unwrap();

        // poll for the inbound command to arrive on the server
        let mut got = None;
        for _ in 0..200 {
            if let Some(m) = server.try_recv() {
                got = Some(m);
                break;
            }
            thread::sleep(Duration::from_millis(5));
        }
        assert!(got.unwrap().contains("estop"), "server should receive the client command");
    }
}
