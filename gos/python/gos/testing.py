"""Helpers for testing your own GOS programs, like ROS's launch_testing: start an app, collect a topic, wait for a condition.

    from gos.testing import collect, wait_until
    def test_my_node():
        with gos.App() as app:
            got = collect(app, '/out')
            my_node.start(app)
            wait_until(lambda: len(got) >= 3, 'three messages on /out')
"""
import time


class GosTimeout(AssertionError):
    """A test waited and the thing never happened. The message says what was expected."""


def collect(app, topic, where=None):
    """Every message on the topic from now on, in a list that fills as they arrive."""
    got = []
    app.topic(topic).subscribe(got.append, where)
    return got


def wait_until(condition, what='the condition', timeout=5.0, app=None, poll=0.01):
    """Wait until condition() is true. Spins the app's executor if it has one, so callbacks run. Fails with what was expected."""
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if app is not None and app.executor is not None: app.spin_once(poll)
        else: time.sleep(poll)
        if condition(): return
    raise GosTimeout(f'Waited {timeout:g} s for {what}, and it did not happen.')
