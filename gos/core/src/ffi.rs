//! The one C interface, identical on native (Python via ctypes) and WebAssembly (the Studio).
//! Text in, text out: the caller allocates input with `gos_alloc`, calls an operation, then reads
//! the JSON reply from `gos_reply_ptr` and `gos_reply_len`. A reply is `{"ok":true,...}` or
//! `{"ok":false,"error":"..."}`, so a failure always says what went wrong.

use crate::{compile, ik, mjcf, tf, GraphIn};
use std::cell::RefCell;

thread_local! { static REPLY: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) }; }

#[unsafe(no_mangle)]
pub extern "C" fn gos_alloc(len: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len);
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// # Safety
/// `ptr` and `len` must come from one `gos_alloc` call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_free(ptr: *mut u8, len: usize) {
    drop(unsafe { Vec::from_raw_parts(ptr, 0, len) });
}

#[unsafe(no_mangle)]
pub extern "C" fn gos_reply_ptr() -> *const u8 { REPLY.with(|r| r.borrow().as_ptr()) }

#[unsafe(no_mangle)]
pub extern "C" fn gos_reply_len() -> usize { REPLY.with(|r| r.borrow().len()) }

#[unsafe(no_mangle)]
pub extern "C" fn gos_version() -> u32 { 1 }

fn reply(text: String) { REPLY.with(|r| *r.borrow_mut() = text.into_bytes()); }

fn fail(error: String) -> i32 {
    reply(serde_json::json!({ "ok": false, "error": error }).to_string());
    0
}

/// Compile a graph. Returns 1 on success and 0 on failure; either way the reply says why.
///
/// # Safety
/// `ptr` must point at `len` readable bytes of UTF-8 JSON.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_compile(ptr: *const u8, len: usize) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let graph: GraphIn = match serde_json::from_slice(bytes) {
        Ok(g) => g,
        Err(e) => return fail(format!("The graph isn't valid: {e}. Expected {{bodies:[{{id}}], joints:[{{id,type,parent,child}}], roots:[]}}.")),
    };
    let mut out = serde_json::to_value(compile(&graph)).unwrap();
    out["ok"] = true.into();
    reply(out.to_string());
    1
}

/// Export a document to MJCF: `{"doc":{...},"name":"..."}` in, `{"ok":true,"xml":...}` out. Leave mesh data out of the input.
///
/// # Safety
/// `ptr` must point at `len` readable bytes of UTF-8 JSON.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_export_mjcf(ptr: *const u8, len: usize) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let input: serde_json::Value = match serde_json::from_slice(bytes) {
        Ok(v) => v,
        Err(e) => return fail(format!("The export request isn't valid JSON: {e}.")),
    };
    let name = input.get("name").and_then(|n| n.as_str()).unwrap_or("tetrobot");
    match mjcf::export(input.get("doc").unwrap_or(&serde_json::Value::Null), name) {
        Ok(out) => {
            let mut v = serde_json::to_value(out).unwrap();
            v["ok"] = true.into();
            reply(v.to_string());
            1
        }
        Err(e) => fail(e),
    }
}

/// Look up a transform in a graph of frames, and report how much every extra path disagrees.
///
/// # Safety
/// `ptr` must point at `len` readable bytes of UTF-8 JSON.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_tf_query(ptr: *const u8, len: usize) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let q: tf::Query = match serde_json::from_slice(bytes) {
        Ok(q) => q,
        Err(e) => return fail(format!("The query isn't valid: {e}. Expected {{edges:[{{parent,child,p,q}}], from, to}}.")),
    };
    match tf::query(&q) {
        Ok(a) => { let mut v = serde_json::to_value(a).unwrap(); v["ok"] = true.into(); reply(v.to_string()); 1 }
        Err(e) => fail(e),
    }
}

/// GraphIK: `{doc, tip, target, root?, iterations?, tolerance?}` in, joint values and both errors out.
///
/// # Safety
/// `ptr` must point at `len` readable bytes of UTF-8 JSON.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_solve_ik(ptr: *const u8, len: usize) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let req: ik::Request = match serde_json::from_slice(bytes) {
        Ok(r) => r,
        Err(e) => return fail(format!("The IK request isn't valid: {e}. Expected {{doc, tip, target:[x,y,z]}}.")),
    };
    match ik::solve(&req) {
        // "ok" in the reply means the call worked; "reached" says whether the goal was met.
        Ok(a) => { let mut v = serde_json::to_value(&a).unwrap(); v["reached"] = a.ok.into(); v["ok"] = true.into(); reply(v.to_string()); 1 }
        Err(e) => fail(e),
    }
}

// ── the TCP wire (net.rs): not in the WebAssembly build, which has no sockets ──

/// Open the TCP wire: `{"address":"host:port"}` in, `{"ok":true,"handle":n,"hub":bool}` out.
///
/// # Safety
/// `ptr` must point at `len` readable bytes of UTF-8 JSON.
#[cfg(not(target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_net_open(ptr: *const u8, len: usize) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let input: serde_json::Value = match serde_json::from_slice(bytes) {
        Ok(v) => v,
        Err(e) => return fail(format!("The wire request isn't valid JSON: {e}.")),
    };
    let address = input.get("address").and_then(|a| a.as_str()).unwrap_or("127.0.0.1:7450");
    match crate::net::Net::open(address) {
        Ok(n) => {
            let hub = n.hub;
            let h = crate::net::register(n);
            reply(serde_json::json!({ "ok": true, "handle": h, "hub": hub }).to_string());
            1
        }
        Err(e) => fail(e),
    }
}

/// Queue one line for peer `to` (`u32::MAX` = every peer). 1 if queued, 0 if that peer is gone.
///
/// # Safety
/// `ptr` must point at `len` readable bytes.
#[cfg(not(target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub unsafe extern "C" fn gos_net_send(h: u32, to: u32, ptr: *const u8, len: usize) -> i32 {
    let line = unsafe { std::slice::from_raw_parts(ptr, len) };
    match crate::net::get(h) { Some(n) => n.send(to, line) as i32, None => 0 }
}

/// Wait up to `timeout_ms` for lines; returns how many items arrived (-1 once closed). The reply holds them as
/// repeated [peer u32 LE][kind u8: 0 line, 1 joined, 2 left][length u32 LE][bytes].
#[cfg(not(target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn gos_net_recv(h: u32, timeout_ms: u32) -> i32 {
    let Some(n) = crate::net::get(h) else { return -1 };
    let Some(items) = n.recv(std::time::Duration::from_millis(timeout_ms as u64)) else { return -1 };
    REPLY.with(|r| {
        let mut out = r.borrow_mut();
        out.clear();
        for (id, kind, data) in &items {
            out.extend_from_slice(&id.to_le_bytes());
            out.push(*kind);
            out.extend_from_slice(&(data.len() as u32).to_le_bytes());
            out.extend_from_slice(data);
        }
    });
    items.len() as i32
}

/// How many message lines the hub passed on without Python.
#[cfg(not(target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn gos_net_forwarded(h: u32) -> u32 {
    crate::net::get(h).map(|n| n.forwarded.load(std::sync::atomic::Ordering::Relaxed)).unwrap_or(0)
}

#[cfg(not(target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn gos_net_close(h: u32) {
    if let Some(n) = crate::net::forget(h) { n.close(); }
}
