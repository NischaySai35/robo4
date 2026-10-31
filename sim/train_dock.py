from paths import tpath
import os, sys, json, time, collections
import numpy as np
sys.path.insert(0, tpath('sim'))
import status as S
from tetro_env import TetroDockEnv
RUN = tpath('runs/dock_v1'); os.makedirs(RUN, exist_ok=True)
TJ = tpath('train.json')
N_ENVS, TOTAL = 12, 40_000_000
def make(i):
    def f(): return TetroDockEnv(seed=1000 + i, max_dist=0.30)
    return f
def build_callback():
  from stable_baselines3.common.callbacks import BaseCallback
  class Prog(BaseCallback):
      def __init__(self):
          super().__init__(); self.eps = collections.deque(maxlen=400); self.t0 = time.time(); self.hist = []; self.last_save = 0; self.max_dist = 0.30
      def _on_step(self):
          for info in self.locals['infos']:
              if 'episode' in info:
                  self.eps.append((info['episode']['r'], float(info.get('success', False)), float(info.get('crash', False)), info.get('phase', 0), info.get('err_mm', 0.0), info.get('kind', '')))
          return True
      def _on_rollout_end(self):
          n = self.num_timesteps; el = time.time() - self.t0
          if self.eps:
              E = np.array([e[:5] for e in self.eps], dtype=float)
              fl = [e for e in self.eps if e[5] == 'floor']
              pt = dict(steps=int(n), mins=round(el / 60, 1), fps=int(n / max(el, 1)), reward=round(float(E[:, 0].mean()), 2), success=round(float(E[:, 1].mean()), 3),
                        crash=round(float(E[:, 2].mean()), 3), hover=round(float((E[:, 3] >= 1).mean()), 3), err_mm=round(float(np.median(E[:, 4])), 1),
                        floor_success=round(float(np.mean([e[1] for e in fl])), 3) if fl else 0.0, max_dist_cm=round(self.max_dist * 100))
              self.hist.append(pt)
              tmp = TJ + '.tmp'
              with open(tmp, 'w') as fh: json.dump({'run': 'dock_v1', 'total': TOTAL, 'points': self.hist}, fh)
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
if __name__ == '__main__':
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import SubprocVecEnv, VecNormalize, VecMonitor
    S.stage('physics', 'done', 'Servo stiffness, PLA flex (5.5 deg / 2.9 deg push test), gear backlash, twist play, delay, noise, pushes. Magnet + lock contact come in task 2.')
    S.stage('train1', 'running', 'Starting 12 parallel modules...')
    S.set_log('logs/train.log'); S.note('TRAINING STARTED: 12 modules in parallel learning align-then-straight-in docking, with full randomization')
    env = VecNormalize(VecMonitor(SubprocVecEnv([make(i) for i in range(N_ENVS)]), info_keywords=('success', 'crash', 'phase', 'err_mm', 'kind')), norm_obs=True, norm_reward=True, clip_obs=10.0)
    import torch
    torch.set_num_threads(4)
    model = PPO('MlpPolicy', env, n_steps=1024, batch_size=3072, n_epochs=5, learning_rate=3e-4, gamma=0.99, gae_lambda=0.95, clip_range=0.2, ent_coef=0.0,
                policy_kwargs=dict(net_arch=dict(pi=[256, 256, 128], vf=[256, 256, 128]), activation_fn=torch.nn.ELU, log_std_init=-0.7), device='cpu', verbose=0, seed=0)
    model.learn(total_timesteps=TOTAL, callback=build_callback())
    model.save(os.path.join(RUN, 'final')); env.save(os.path.join(RUN, 'vecnorm.pkl'))
    S.stage('train1', 'done', 'Finished %dM steps' % (TOTAL / 1e6)); S.note('Training run dock_v1 finished')
