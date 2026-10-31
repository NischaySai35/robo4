from paths import tpath
import os, sys, json, time, collections
import numpy as np
sys.path.insert(0, tpath('sim'))
import status as S
from tetro_env2 import TetroDockEnv
RUN = tpath('runs/dock_v4'); os.makedirs(RUN, exist_ok=True)
TJ = tpath('train.json')
N_ENVS, TOTAL = 12, 40_000_000
def make(i):
    def f(): return TetroDockEnv(seed=1000 + i, max_dist=0.30)
    return f
def build_callback():
  from stable_baselines3.common.callbacks import BaseCallback
  class Prog(BaseCallback):
      def __init__(self):
          super().__init__(); self.eps = collections.deque(maxlen=400); self.t0 = time.time(); self.hist = []; self.last_save = 0; self.n0 = None; self.max_dist = 0.30
      def _on_step(self):
          for info in self.locals['infos']:
              if 'episode' in info:
                  self.eps.append((info['episode']['r'], float(info.get('success', False)), float(info.get('crash', False)), info.get('phase', 0), info.get('err_mm', 0.0), info.get('kind', '')))
          return True
      def _on_rollout_end(self):
          n = self.num_timesteps; el = time.time() - self.t0
          if getattr(self, 'n0', None) is None: self.n0 = n; self.t0 = time.time(); el = 1
          if self.eps:
              E = np.array([e[:5] for e in self.eps], dtype=float)
              fl = [e for e in self.eps if e[5] == 'floor']
              pt = dict(steps=int(n), mins=round(el / 60, 1), fps=int((n - self.n0) / max(el, 1)), reward=round(float(E[:, 0].mean()), 2), success=round(float(E[:, 1].mean()), 3),
                        crash=round(float(E[:, 2].mean()), 3), hover=round(float((E[:, 3] >= 1).mean()), 3), seated=round(float((E[:, 3] >= 2).mean()), 3), err_mm=round(float(np.median(E[:, 4])), 1),
                        floor_success=round(float(np.mean([e[1] for e in fl])), 3) if fl else 0.0, max_dist_cm=round(self.max_dist * 100))
              self.hist.append(pt)
              tmp = TJ + '.tmp'
              with open(tmp, 'w') as fh: json.dump({'run': 'dock_v4', 'total': TOTAL, 'points': self.hist}, fh)
              for _ in range(10):
                  try: os.replace(tmp, TJ); break
                  except PermissionError: time.sleep(0.05)
              S.stage('train1', 'running', 'Learning to dock: %.1fM / %dM steps, success %.0f%%, reached hover %.0f%%, crashes %.0f%%, targets up to %d cm, %d steps/s' % (n / 1e6, TOTAL / 1e6, 100 * pt['success'], 100 * pt['hover'], 100 * pt['crash'], self.max_dist * 100, pt['fps']))
              S.log('train %.2fM steps | reward %.1f | success %.1f%% | hover %.1f%% | crash %.1f%% | median err %.1f mm | %d/s' % (n / 1e6, pt['reward'], 100 * pt['success'], 100 * pt['hover'], 100 * pt['crash'], pt['err_mm'], pt['fps']), f=tpath('logs/train.log'))
              if pt['success'] > 0.6 and self.max_dist < 0.42 and len(self.eps) > 300:
                  self.max_dist = min(0.42, self.max_dist + 0.04); self.training_env.set_attr('max_dist', self.max_dist); self.eps.clear()
                  S.note('Curriculum: success above 60%%, targets now out to %d cm' % (self.max_dist * 100))
          if n - self.last_save > 300_000:
              self.model.save(os.path.join(RUN, 'latest')); self.training_env.save(os.path.join(RUN, 'vecnorm.pkl')); self.last_save = n
              pn = self.model.policy; Ws = {}
              lin = [l for l in pn.mlp_extractor.policy_net if hasattr(l, 'weight')] + [pn.action_net]
              for i, l in enumerate(lin): Ws['W%d' % i] = l.weight.detach().cpu().numpy(); Ws['b%d' % i] = l.bias.detach().cpu().numpy()
              vn = self.training_env; Ws['mean'] = vn.obs_rms.mean; Ws['var'] = vn.obs_rms.var; Ws['steps'] = np.array(n)
              np.savez(os.path.join(RUN, 'brain_tmp.npz'), **Ws); os.replace(os.path.join(RUN, 'brain_tmp.npz'), os.path.join(RUN, 'brain.npz'))
  return Prog()

def LightVec(n, seed0, kw):
    import multiprocessing as mp
    from stable_baselines3.common.vec_env import SubprocVecEnv
    from stable_baselines3.common.vec_env.base_vec_env import VecEnv
    import light_worker
    class _LV(SubprocVecEnv):
        def __init__(self):
            self.waiting = False; self.closed = False; ctx = mp.get_context('spawn')
            self.remotes, self.work_remotes = zip(*[ctx.Pipe() for _ in range(n)]); self.processes = []
            for i, (wr, r) in enumerate(zip(self.work_remotes, self.remotes)):
                p = ctx.Process(target=light_worker.worker, args=(wr, r, seed0 + i, kw), daemon=True); p.start(); self.processes.append(p); wr.close()
            self.remotes[0].send(('get_spaces', None)); os_, as_ = self.remotes[0].recv()
            VecEnv.__init__(self, n, os_, as_)
        def env_is_wrapped(self, wrapper_class, indices=None):
            return [False] * len(self._get_indices(indices))
    return _LV()
if __name__ == '__main__':
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import SubprocVecEnv, VecNormalize, VecMonitor
    S.stage('physics', 'done', 'Real connectors: 4 pads/8 magnets on End B and the Body117 receiver; magnets 4.6 N per pair x0.6-1.4; springy base lock 0.5-1 deg / 0-0.5 mm; PLA flex, backlash, delay, noise, pushes')
    S.stage('train1', 'running', 'Starting 12 parallel modules...')
    S.set_log('logs/train.log'); S.note('IK+RL RUN (dock_v4) STARTED: IK does the big move, RL learns only the sag/backlash correction. Old pure-RL brain kept in runs/dock_v3 (paused, resumable).')
    venv = VecMonitor(LightVec(N_ENVS, 1000, dict(max_dist=0.30, ik_assist=True)), info_keywords=('success', 'crash', 'phase', 'err_mm', 'kind', 'slot_deg', 'axial_mm'))
    RES = os.path.exists(os.path.join(RUN, 'latest.zip')) and os.path.exists(os.path.join(RUN, 'vecnorm.pkl'))
    env = VecNormalize.load(os.path.join(RUN, 'vecnorm.pkl'), venv) if RES else VecNormalize(venv, norm_obs=True, norm_reward=True, clip_obs=10.0)
    import torch
    DEV = 'cpu'   # measured: GPU update was not faster for this small network
    torch.set_num_threads(4)
    if RES: S.note('Continuing from the saved brain (no restart from zero)')
    model = PPO.load(os.path.join(RUN, 'latest'), env=env, device=DEV) if RES else PPO('MlpPolicy', env, n_steps=1024, batch_size=3072, n_epochs=5, learning_rate=3e-4, gamma=0.99, gae_lambda=0.95, clip_range=0.2, ent_coef=0.0,
                policy_kwargs=dict(net_arch=dict(pi=[256, 256, 128], vf=[256, 256, 128]), activation_fn=torch.nn.ELU, log_std_init=-0.7), device=DEV, verbose=0, seed=0)
    model.learn(total_timesteps=TOTAL, callback=build_callback(), reset_num_timesteps=not RES)
    model.save(os.path.join(RUN, 'final')); env.save(os.path.join(RUN, 'vecnorm.pkl'))
    S.stage('train1', 'done', 'Finished %dM steps' % (TOTAL / 1e6)); S.note('Training run dock_v4 finished')
