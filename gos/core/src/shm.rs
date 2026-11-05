//! Safe handover of big arrays through shared memory (G10 step 5), for `gos.bigdata.SharedArrays`.
//!
//! Measured 6 Nov 2026: with one buffer per topic that the sender simply overwrote, 257 of 300 camera pictures were
//! read while the next one was being written (half old, half new). Now each topic has a few slots used in turn, and
//! every slot starts with a counter (a "seqlock"): odd while it is being written, even when done. A reader copies the
//! slot and checks the counter did not move; if it did, that picture was overwritten by a newer one, and the reader
//! skips it (the newer one's message is on its way). The fences make this correct on Apple and ARM chips too, where
//! Python alone cannot order memory.
//!
//! Slot layout: [counter u64][56 bytes padding][data], so the data starts 64 bytes in (one cache line).
// REUSE-CHECKED: shared memory|seqlock|shm -> gos/python/gos/bigdata.py has the shared memory itself (Python's
// multiprocessing.shared_memory); nothing in gos/core orders memory between programs. This adds only the ordering.

use std::sync::atomic::{fence, AtomicU64, Ordering};

pub const HEADER: usize = 64;

/// # Safety
/// `slot` must point at a writable slot of at least `HEADER + n` bytes, 8-byte aligned; `src` at `n` readable bytes.
pub unsafe fn write(slot: *mut u8, src: *const u8, n: usize) -> u64 {
    let seq = unsafe { &*(slot as *const AtomicU64) };
    let s = seq.load(Ordering::Relaxed);
    let s = s + (s & 1);  // a writer that died half-way left it odd: carry on from the next even number
    seq.store(s + 1, Ordering::Relaxed);
    fence(Ordering::Release);
    unsafe { std::ptr::copy_nonoverlapping(src, slot.add(HEADER), n) };
    seq.store(s + 2, Ordering::Release);
    s + 2
}

/// Copy the slot into `dst` if it still holds picture number `want`. False if it was overwritten or is being written.
///
/// # Safety
/// `slot` must point at a slot of at least `HEADER + n` bytes, 8-byte aligned; `dst` at `n` writable bytes.
pub unsafe fn read(slot: *const u8, dst: *mut u8, n: usize, want: u64) -> bool {
    let seq = unsafe { &*(slot as *const AtomicU64) };
    if seq.load(Ordering::Acquire) != want { return false; }
    unsafe { std::ptr::copy_nonoverlapping(slot.add(HEADER), dst, n) };
    fence(Ordering::Acquire);
    seq.load(Ordering::Relaxed) == want
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_reader_never_gets_a_half_written_picture() {
        const N: usize = 1 << 16;
        let mut slot = vec![0u64; (HEADER + N) / 8];  // u64s, so it is aligned
        let p = slot.as_mut_ptr() as usize;
        let writer = std::thread::spawn(move || {
            let mut last = 0;
            for i in 0..2000u32 {
                let src = vec![(i % 251) as u8; N];
                last = unsafe { write(p as *mut u8, src.as_ptr(), N) };
            }
            last
        });
        let (mut whole, mut skipped) = (0, 0);
        let mut dst = vec![0u8; N];
        while !writer.is_finished() {
            let want = unsafe { (*(p as *const AtomicU64)).load(Ordering::Acquire) };
            if want & 1 == 1 { continue; }
            if unsafe { read(p as *const u8, dst.as_mut_ptr(), N, want) } {
                assert!(dst.iter().all(|&b| b == dst[0]), "a torn picture got through");
                whole += 1;
            } else {
                skipped += 1;
            }
        }
        let last = writer.join().unwrap();
        assert_eq!(last, 4000);
        assert!(unsafe { read(p as *const u8, dst.as_mut_ptr(), N, last) });
        assert!(whole > 0, "read {whole} whole, skipped {skipped}");
    }
}
