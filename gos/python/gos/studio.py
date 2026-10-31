"""The Studio as a client: a script shows its robot in the window and runs any Studio command by name.

Only this machine can connect, and only with the token, because a connected Studio can also reach real hardware.
"""
import json, queue, secrets, threading, time

from .app import GosError, Result


class StudioLink:
    def __init__(self, port=8772, token=None):
        try:
            from websockets.sync.server import serve
        except ImportError as e:
            raise GosError('The Studio link needs: py -3.12 -m pip install websockets') from e
        self.token = token or secrets.token_urlsafe(16)
        self.port = port
        self._conn = None
        self._ready = threading.Event()
        self._replies: dict[int, queue.Queue] = {}
        self._next = 1
        self.operators = []
        self._server = serve(self._handle, '127.0.0.1', port)
        threading.Thread(target=self._server.serve_forever, daemon=True).start()

    @property
    def url(self):
        return f'ws://127.0.0.1:{self.port}'

    def open_hint(self):
        return f'In the Studio open the GOS panel and connect to {self.url} with token {self.token}, or open it with ?gos={self.url}&token={self.token}'

    def _handle(self, conn):
        try:
            hello = json.loads(conn.recv(timeout=5))
            if hello.get('type') != 'hello' or not secrets.compare_digest(str(hello.get('token')), self.token):
                conn.send(json.dumps({'type': 'denied', 'error': 'Wrong token: copy it from the script that started GOS.'}))
                return
            self.operators = hello.get('operators', [])
            self._conn = conn
            conn.send(json.dumps({'type': 'welcome'}))
            self._ready.set()
            for raw in conn:
                m = json.loads(raw)
                if m.get('type') == 'reply' and m.get('id') in self._replies:
                    self._replies[m['id']].put(m)
        except Exception:
            pass  # a closed page ends the link; the next call reports it
        finally:
            if self._conn is conn:
                self._conn = None
                self._ready.clear()

    def wait(self, timeout=30):
        """Wait until a Studio connects. Raises with the steps to connect if none does."""
        if not self._ready.wait(timeout):
            raise GosError(f'No Studio connected after {timeout} s. {self.open_hint()}')
        return self

    @property
    def connected(self):
        return self._conn is not None

    def _request(self, kind, timeout=20, **fields):
        conn = self._conn
        if conn is None: return Result(False, f'No Studio is connected. {self.open_hint()}')
        rid = self._next; self._next += 1
        q = self._replies[rid] = queue.Queue()
        try:
            conn.send(json.dumps({'type': kind, 'id': rid, **fields}))
            r = q.get(timeout=timeout)
        except queue.Empty:
            return Result(False, f'The Studio did not answer {kind} within {timeout} s.')
        except Exception as e:
            return Result(False, f'The Studio link closed: {e}')
        finally:
            self._replies.pop(rid, None)
        return Result(bool(r.get('ok')), r.get('error', ''), r.get('value') or {})

    def run(self, operator, **props):
        """Run a Studio command by name, the same one its button or shortcut runs. The list is in .operators."""
        return self._request('run', op=operator, props=props or None)

    def show(self, document):
        """Show a document in the Studio's Editor, replacing what is open there."""
        return self._request('load', doc=document)

    def read(self):
        """What the Studio shows now: bodies, joints and the VSEPR score."""
        return self._request('read')

    def joints(self, names, values):
        """Pose the robot on screen by MuJoCo joint name. Fire and forget, so playback keeps its rate."""
        conn = self._conn
        if conn is None: return False
        try:
            conn.send(json.dumps({'type': 'joints', 'names': list(names), 'q': [float(v) for v in values]}))
            return True
        except Exception:
            return False

    def close(self):
        self._server.shutdown()
