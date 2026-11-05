"""Large arrays between programs on one computer without copying them through the message channel (ROS's
loaned messages / buffer backends). The array goes into shared memory; only its name, shape and type travel.
Each topic has a few slots used in turn, each guarded by a counter in the Rust core (gos/core/src/shm.rs), so a
reader never gets a picture that was being overwritten: measured before (6 Nov 2026), 257 of 300 were torn.
A Warp array on an NVIDIA card stays on the card: only a CUDA handle travels, and the other program reads the same
graphics memory. CUDA allows this on Linux (WSL included), not on Windows itself.
"""
import base64
from multiprocessing import shared_memory
import numpy as np

SLOTS = 3      # a reader as slow as two more pictures still gets whole ones; slower, it skips to the newest
HEADER = 64    # the counter's cache line before each slot's data (shm.rs)


def _on_gpu(a):
    return hasattr(a, 'ipc_handle') and getattr(getattr(a, 'device', None), 'is_cuda', False)


class SharedArrays:
    def __init__(self, bus):
        self.bus, self._mine, self._open, self._gpu, self._dst = bus, {}, {}, {}, {}
        self.skipped = 0  # pictures overwritten by a newer one before this program read them

    @staticmethod
    def _map(shm):
        view = np.frombuffer(shm.buf, np.uint8)  # only to know the address; dropped before the memory is closed
        return {'shm': shm, 'view': view, 'addr': view.ctypes.data}

    @staticmethod
    def _unmap(m, unlink=False):
        m.pop('view', None)
        m['shm'].close()
        if unlink: m['shm'].unlink()

    def publish(self, topic, array):
        if _on_gpu(array): return self._publish_gpu(topic, array)
        from . import _core
        a = np.ascontiguousarray(array)
        stride = HEADER + -(-a.nbytes // 64) * 64
        w = self._mine.get(topic)
        if w is None or w['stride'] < stride:
            if w is not None: self._unmap(w, unlink=True)
            w = self._mine[topic] = self._map(shared_memory.SharedMemory(create=True, size=SLOTS * stride))
            w.update(stride=stride, slot=0)
        k = w['slot'] = (w['slot'] + 1) % SLOTS
        seq = _core.shm_write(w['addr'] + k * w['stride'], a.ctypes.data, a.nbytes)
        self.bus.publish(topic, {'shm': w['shm'].name, 'slot': k, 'stride': w['stride'], 'seq': seq, 'shape': list(a.shape), 'dtype': str(a.dtype)})

    def _publish_gpu(self, topic, a):
        import warp as wp
        import platform
        if not a.device.is_ipc_supported:
            raise RuntimeError(f'{a.device} cannot share memory with other programs here (CUDA allows it on Linux, not on Windows). Send a.numpy() instead.')
        if 'microsoft' in platform.uname().release.lower():
            # checked 3 Nov 2026: WSL says yes, but the other program opens zeros and its writes never come back
            raise RuntimeError('WSL reports CUDA memory sharing but it does not work (the other program sees zeros). Send a.numpy() instead, or run on native Linux.')
        # one buffer per topic, kept alive here while others read it; refilled on the card when the shape stays the same
        buf = self._gpu.get(topic)
        if buf is None or buf.shape != a.shape or buf.dtype != a.dtype or buf.device != a.device:
            with wp.ScopedMempool(a.device, False):  # memory from Warp's pool cannot be shared
                buf = self._gpu[topic] = wp.empty(a.shape, dtype=a.dtype, device=a.device)
        wp.copy(buf, a); wp.synchronize_device(a.device)
        self.bus.publish(topic, {'cuda_ipc': base64.b64encode(bytes(buf.ipc_handle())).decode(), 'shape': list(a.shape),
                                 'dtype': a.dtype.__name__, 'device': str(a.device)})

    def subscribe(self, topic, fn):
        """fn receives each whole picture in a buffer of this program that the next picture reuses, or a Warp array on
        the card for one sent from the card: copy it if you keep it past the call. A picture that was overwritten
        before it could be read is skipped (counted in .skipped); the newer one follows."""
        from . import _core
        def on(m):
            if 'cuda_ipc' in m: return fn(self._open_gpu(m))
            r = self._open.get(m['shm'])
            if r is None: r = self._open[m['shm']] = self._map(shared_memory.SharedMemory(name=m['shm']))
            shape, dtype = tuple(m['shape']), np.dtype(m['dtype'])
            dst = self._dst.get(topic)
            if dst is None or dst.shape != shape or dst.dtype != dtype: dst = self._dst[topic] = np.empty(shape, dtype)
            if _core.shm_read(r['addr'] + m['slot'] * m['stride'], dst.ctypes.data, dst.nbytes, m['seq']): fn(dst)
            else: self.skipped += 1
        return self.bus.subscribe(topic, on)

    def _open_gpu(self, m):
        import warp as wp
        key = (m['cuda_ipc'], m['dtype'], tuple(m['shape']))
        if key not in self._open:
            self._open[key] = wp.from_ipc_handle(base64.b64decode(m['cuda_ipc']), getattr(wp, m['dtype']), tuple(m['shape']), device=m['device'])
        return self._open[key]

    def close(self):
        for r in self._open.values():
            if isinstance(r, dict): self._unmap(r)
        for w in self._mine.values(): self._unmap(w, unlink=True)
        self._open, self._mine, self._gpu, self._dst = {}, {}, {}, {}
