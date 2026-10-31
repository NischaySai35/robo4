"""Large arrays between programs on one computer without copying them through the message channel (ROS's
loaned messages / buffer backends). The array goes into shared memory; only its name, shape and type travel.
"""
from multiprocessing import shared_memory
import numpy as np


class SharedArrays:
    def __init__(self, bus): self.bus, self._mine, self._open = bus, {}, {}

    def publish(self, topic, array):
        a = np.ascontiguousarray(array)
        shm = self._mine.get(topic)
        if shm is None or shm.size < a.nbytes:
            if shm is not None: shm.close(); shm.unlink()
            shm = self._mine[topic] = shared_memory.SharedMemory(create=True, size=a.nbytes)
        np.ndarray(a.shape, a.dtype, buffer=shm.buf)[...] = a
        self.bus.publish(topic, {'shm': shm.name, 'shape': list(a.shape), 'dtype': str(a.dtype)})

    def subscribe(self, topic, fn):
        """fn receives a numpy view of the shared memory: copy it if you keep it past the call."""
        def on(m):
            shm = self._open.get(m['shm'])
            if shm is None: shm = self._open[m['shm']] = shared_memory.SharedMemory(name=m['shm'])
            fn(np.ndarray(tuple(m['shape']), np.dtype(m['dtype']), buffer=shm.buf))
        return self.bus.subscribe(topic, on)

    def close(self):
        for s in self._open.values(): s.close()
        for s in self._mine.values(): s.close(); s.unlink()
        self._open, self._mine = {}, {}
