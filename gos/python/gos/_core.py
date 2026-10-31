"""The GOS Rust core, loaded through its C interface. No compiler or extra package is needed to use it."""
import ctypes, json, os, sys

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


def graph_of_document(doc: dict, roots=None) -> dict:
    """The core's view of a Studio document, without the mesh data."""
    return {
        'bodies': [{'id': i} for i in doc['bodies']],
        'joints': [{'id': i, 'type': j.get('type', ''), 'parent': j.get('parentBodyId'), 'child': j.get('childBodyId'),
                    'disabled': bool((j.get('state') or {}).get('disabled'))} for i, j in doc['joints'].items()],
        'roots': list(roots or []),
    }
