"""The GOS Rust core, loaded through its C interface. No compiler or extra package is needed to use it."""
import ctypes, json, os, struct, sys

_NAMES = {'win32': 'gos_core.dll', 'darwin': 'libgos_core.dylib'}
_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_native', _NAMES.get(sys.platform, 'libgos_core.so'))
_lib = None


def _load():
    global _lib
    if _lib is None:
        if not os.path.exists(_PATH):
            raise OSError(f'GOS core not found at {_PATH}. Build it with: py -3.12 gos/build.py')
        lib = ctypes.CDLL(_PATH)
        lib.gos_alloc.restype = ctypes.c_void_p; lib.gos_alloc.argtypes = [ctypes.c_size_t]
        lib.gos_free.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
        lib.gos_reply_ptr.restype = ctypes.c_void_p
        lib.gos_reply_len.restype = ctypes.c_size_t
        _lib = lib
    return _lib


def _call(op: str, payload: dict) -> dict:
    lib = _load()
    fn = getattr(lib, op)
    fn.restype = ctypes.c_int; fn.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
    text = json.dumps(payload).encode()
    ptr = lib.gos_alloc(len(text))
    ctypes.memmove(ptr, text, len(text))
    fn(ptr, len(text))
    lib.gos_free(ptr, len(text))
    reply = json.loads(ctypes.string_at(lib.gos_reply_ptr(), lib.gos_reply_len()))
    if not reply.pop('ok'):
        raise ValueError(reply['error'])
    return reply


def compile_graph(graph: dict) -> dict:
    """Spanning tree, loops, rigid groups and parts of a robot graph. Raises ValueError saying what is wrong."""
    return _call('gos_compile', graph)


def export_mjcf(doc: dict, name: str = 'tetrobot') -> dict:
    """MJCF text, mesh list and name maps for a document. Same code as the Studio's File > Export."""
    light = {k: v for k, v in doc.items() if k != 'assets'}
    return _call('gos_export_mjcf', {'doc': light, 'name': name})


def tf_query(edges, frm, to) -> dict:
    """Transform from one frame to another, with the mismatch of every extra path (loop-closure error)."""
    return _call('gos_tf_query', {'edges': edges, 'from': frm, 'to': to})


def solve_ik(doc: dict, tip: str, target, root=None, iterations=200, tolerance=0.001) -> dict:
    """GraphIK in the Rust core, the same code the Studio runs: holds closed loops. Returns values, reached, both errors."""
    light = {k: v for k, v in doc.items() if k != 'assets'}
    return _call('gos_solve_ik', {'doc': light, 'tip': tip, 'target': list(target), 'root': root, 'iterations': iterations, 'tolerance': tolerance})


def graph_of_document(doc: dict, roots=None) -> dict:
    """The core's view of a Studio document, without the mesh data."""
    return {
        'bodies': [{'id': i} for i in doc['bodies']],
        'joints': [{'id': i, 'type': j.get('type', ''), 'parent': j.get('parentBodyId'), 'child': j.get('childBodyId'),
                    'disabled': bool((j.get('state') or {}).get('disabled'))} for i, j in doc['joints'].items()],
        'roots': list(roots or []),
    }


# ── the TCP wire (gos/core/src/net.rs), used by transport.TcpTransport ──

def has_net() -> bool:
    """Whether this build of the core has the TCP wire (older builds, and the WebAssembly one, do not)."""
    try: lib = _load()
    except OSError: return False
    if not hasattr(lib, 'gos_net_open'): return False
    if not getattr(lib, '_net_ready', False):
        lib.gos_net_send.restype = ctypes.c_int; lib.gos_net_send.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_char_p, ctypes.c_size_t]
        lib.gos_net_recv.restype = ctypes.c_int; lib.gos_net_recv.argtypes = [ctypes.c_uint32, ctypes.c_uint32]
        lib.gos_net_forwarded.restype = ctypes.c_uint32; lib.gos_net_forwarded.argtypes = [ctypes.c_uint32]
        lib.gos_net_close.restype = None; lib.gos_net_close.argtypes = [ctypes.c_uint32]
        lib._net_ready = True
    return True


def net_open(address: str):
    """(handle, is_hub). Raises OSError saying why the address could neither be opened nor reached."""
    if not has_net(): raise OSError('This build of the GOS core has no TCP wire. Rebuild it with: py -3.12 gos/build.py')
    try: r = _call('gos_net_open', {'address': address})
    except ValueError as e: raise OSError(str(e)) from None
    return r['handle'], r['hub']


def net_send(handle: int, to: int, data: bytes) -> bool: return _lib.gos_net_send(handle, to, data, len(data)) == 1


def net_recv(handle: int, timeout: float):
    """[(peer, kind, bytes)] that arrived (kind 0 line, 1 joined, 2 left), [] after the timeout, None once closed."""
    lib = _lib
    n = lib.gos_net_recv(handle, max(0, int(timeout * 1000)))
    if n < 0: return None
    if n == 0: return []
    buf = ctypes.string_at(lib.gos_reply_ptr(), lib.gos_reply_len())
    out, i, unpack = [], 0, struct.unpack_from
    for _ in range(n):
        pid, kind, size = unpack('<IBI', buf, i); i += 9
        out.append((pid, kind, buf[i:i + size])); i += size
    return out


def net_forwarded(handle: int) -> int: return _lib.gos_net_forwarded(handle)


def net_close(handle: int) -> None: _lib.gos_net_close(handle)
