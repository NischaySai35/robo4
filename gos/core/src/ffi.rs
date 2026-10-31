//! The one C interface, identical on native (Python via ctypes) and WebAssembly (the Studio).
//! Text in, text out: the caller allocates input with `gos_alloc`, calls an operation, then reads
//! the JSON reply from `gos_reply_ptr` and `gos_reply_len`. A reply is `{"ok":true,...}` or
//! `{"ok":false,"error":"..."}`, so a failure always says what went wrong.

use crate::{compile, mjcf, tf, GraphIn};
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
