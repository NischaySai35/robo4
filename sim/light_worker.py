"""Torch-free worker process for vectorised training (saves ~1.4 GB of memory commit per worker on Windows)."""
from paths import tpath
import sys
sys.path.insert(0, tpath('sim'))
def worker(remote, parent_remote, seed, kw):
    from tetro_env2 import TetroDockEnv
    parent_remote.close(); env = TetroDockEnv(seed=seed, **kw); reset_info = {}
    while True:
        try:
            cmd, data = remote.recv()
            if cmd == 'step':
                obs, rew, term, trunc, info = env.step(data); done = term or trunc
                info['TimeLimit.truncated'] = trunc and not term
                if done: info['terminal_observation'] = obs; obs, reset_info = env.reset()
                remote.send((obs, rew, done, info, reset_info))
            elif cmd == 'reset':
                obs, reset_info = env.reset(seed=data[0]); remote.send((obs, reset_info))
            elif cmd == 'close': remote.close(); break
            elif cmd == 'get_spaces': remote.send((env.observation_space, env.action_space))
            elif cmd == 'env_method': remote.send(getattr(env, data[0])(*data[1], **data[2]))
            elif cmd == 'get_attr': remote.send(getattr(env, data))
            elif cmd == 'has_attr': remote.send(hasattr(env, data))
            elif cmd == 'set_attr': remote.send(setattr(env, data[0], data[1]))
            elif cmd == 'is_wrapped': remote.send(False)
            elif cmd == 'render': remote.send(None)
            else: raise NotImplementedError(cmd)
        except (EOFError, KeyboardInterrupt): break
