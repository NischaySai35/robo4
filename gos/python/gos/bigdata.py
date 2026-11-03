"""Large arrays between programs on one computer without copying them through the message channel (ROS's
loaned messages / buffer backends). The array goes into shared memory; only its name, shape and type travel.
A Warp array on an NVIDIA card stays on the card: only a CUDA handle travels, and the other program reads the same
graphics memory. CUDA allows this on Linux (WSL included), not on Windows itself.
"""
import base64
from multiprocessing import shared_memory
import numpy as np


def _on_gpu(a):
    return hasattr(a, 'ipc_handle') and getattr(getattr(a, 'device', None), 'is_cuda', False)


class SharedArrays:
    def __init__(self, bus): self.bus, self._mine, self._open, self._gpu = bus, {}, {}, {}

    def publish(self, topic, array):
        if _on_gpu(array): return self._publish_gpu(topic, array)
        a = np.ascontiguousarray(array)
        shm = self._mine.get(topic)
        if shm is None or shm.size < a.nbytes:
            if shm is not None: shm.close(); shm.unlink()
            shm = self._mine[topic] = shared_memory.SharedMemory(create=True, size=a.nbytes)
        np.ndarray(a.shape, a.dtype, buffer=shm.buf)[...] = a
        self.bus.publish(topic, {'shm': shm.name, 'shape': list(a.shape), 'dtype': str(a.dtype)})

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
        """fn receives a numpy view of the shared memory, or a Warp array on the card for one sent from the card:
        copy it if you keep it past the call."""
        def on(m):
            if 'cuda_ipc' in m: return fn(self._open_gpu(m))
            shm = self._open.get(m['shm'])
            if shm is None: shm = self._open[m['shm']] = shared_memory.SharedMemory(name=m['shm'])
            fn(np.ndarray(tuple(m['shape']), np.dtype(m['dtype']), buffer=shm.buf))
        return self.bus.subscribe(topic, on)

    def _open_gpu(self, m):
        import warp as wp
        key = (m['cuda_ipc'], m['dtype'], tuple(m['shape']))
        if key not in self._open:
            self._open[key] = wp.from_ipc_handle(base64.b64decode(m['cuda_ipc']), getattr(wp, m['dtype']), tuple(m['shape']), device=m['device'])
        return self._open[key]

    def close(self):
        for s in self._open.values():
            if hasattr(s, 'close'): s.close()
        for s in self._mine.values(): s.close(); s.unlink()
        self._open, self._mine, self._gpu = {}, {}, {}
