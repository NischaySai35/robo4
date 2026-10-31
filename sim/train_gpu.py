"""GPU training (MuJoCo Warp): continues the SAME brain as the CPU run (dock_v3) with thousands of robots on the RTX 5050."""
from paths import tpath
import os, sys, json, time, math, shutil, collections
import numpy as np, torch
sys.path.insert(0, tpath('sim'))
import status as S
IKM = os.environ.get('IK_MODE', '')
RUN = tpath('runs/dock_ikrl') if IKM else tpath('runs/dock_gpu'); SRC = tpath('runs/dock_v3'); TJ = tpath('train_gpu.json'); LOG = tpath('logs/train_gpu.log')
N = int(os.environ.get('NROBOTS', '2048')); TOTAL = 400_000_000
os.makedirs(RUN, exist_ok=True)
if not IKM and not os.path.exists(os.path.join(RUN, 'latest.zip')):
    for f in ['latest.zip', 'vecnorm.pkl', 'brain.npz']: shutil.copy(os.path.join(SRC, f), os.path.join(RUN, f))
def log(s):
    open(LOG, 'a').write(time.strftime('[%H:%M:%S] ') + s + '\n')
if __name__ == '__main__':
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import VecNormalize, VecMonitor
    from stable_baselines3.common.buffers import RolloutBuffer
    from stable_baselines3.common.callbacks import BaseCallback
    from tetro_gpu import GPUDock
    S.note(('GPU IK+RL TRAINING STARTED: %d robots, sag-aware IK does the move, new brain learns small corrections (run dock_ikrl)' if IKM else 'GPU TRAINING (MuJoCo Warp) STARTED: %d robots on the RTX 5050, continuing the same brain from dock_v3') % N)
    log('building %d robots' % N)
    venv = VecMonitor(GPUDock(n=N, floor_frac=0.9, max_dist=0.30), info_keywords=('success', 'crash', 'phase', 'err_mm', 'kind', 'slot_deg', 'axial_mm'))
    if IKM: venv.venv.ik_mode = 'ik' if hasattr(venv, 'venv') else None
    RES = os.path.exists(os.path.join(RUN, 'latest.zip'))
    if RES:
        env = VecNormalize.load(os.path.join(RUN, 'vecnorm.pkl'), venv); env.training = True; env.norm_reward = True
        model = PPO.load(os.path.join(RUN, 'latest'), env=env, device='cuda')
    else:
        env = VecNormalize(venv, norm_obs=True, norm_reward=True, clip_obs=10.0)
        model = PPO('MlpPolicy', env, n_steps=32, batch_size=8192, n_epochs=5, learning_rate=3e-4, gamma=0.99, gae_lambda=0.95, clip_range=0.2, ent_coef=0.0,
                    policy_kwargs=dict(net_arch=dict(pi=[256, 256, 128], vf=[256, 256, 128]), activation_fn=torch.nn.ELU, log_std_init=-1.0), device='cuda', verbose=0, seed=0)
    NS = 32; model.n_steps = NS; model.batch_size = 8192; model.n_epochs = 5
    model.rollout_buffer = RolloutBuffer(NS, env.observation_space, env.action_space, device=model.device, gamma=model.gamma, gae_lambda=model.gae_lambda, n_envs=env.num_envs)
    if os.environ.get('SET_STD'):
        with torch.no_grad(): model.policy.log_std.data[:] = math.log(float(os.environ['SET_STD']))   # exploration noise: ~0.6 deg/step instead of 2-4 deg
        log('exploration noise set to std %s' % os.environ['SET_STD'])
    start_steps = model.num_timesteps
    class CB(BaseCallback):
        def __init__(self):
            super().__init__(); self.eps = collections.deque(maxlen=4000); self.hist = []; self.t0 = None; self.n0 = None; self.last_save = 0
            self.htol = (float(os.environ.get('HTOL0', '0.015')), math.radians(float(os.environ.get('HTOL0_DEG', '6'))))
        def _on_training_start(self): self.training_env.set_attr('htol', self.htol)
        def _on_step(self):
            for info in self.locals['infos']:
                if 'episode' in info: self.eps.append((info['episode']['r'], float(info['success']), float(info['crash']), info['phase'], info['err_mm'], info['kind']))
            return True
        def _on_rollout_end(self):
            n = self.num_timesteps
            if self.n0 is None: self.n0, self.t0 = n, time.time(); return
            if not self.eps: return
            E = np.array([e[:5] for e in self.eps], dtype=float); fl = [e for e in self.eps if e[5] == 'floor']
            pt = dict(steps=int(n), robots=N, fps=int((n - self.n0) / max(time.time() - self.t0, 1)), reward=round(float(E[:, 0].mean()), 2), success=round(float(E[:, 1].mean()), 4),
                      crash=round(float(E[:, 2].mean()), 4), hover=round(float((E[:, 3] >= 1).mean()), 4), seated=round(float((E[:, 3] >= 2).mean()), 4), err_mm=round(float(np.nanmedian(E[:, 4])), 1),
                      floor_success=round(float(np.mean([e[1] for e in fl])), 4) if fl else 0.0, hover_gate_mm=round(self.htol[0] * 1000, 1))
            self.hist.append(pt); self.hist = self.hist[-400:]
            json.dump({'run': os.path.basename(RUN), 'engine': 'MuJoCo Warp (GPU)', 'points': self.hist}, open(TJ + '.tmp', 'w'))
            for _ in range(10):
                try: os.replace(TJ + '.tmp', TJ); break
                except PermissionError: time.sleep(0.05)
            log('%.2fM steps | %d/s | hover %.1f%% (gate %.1f mm) | seated %.1f%% | docked %.2f%% | crash %.1f%% | err %.1f mm' % (n / 1e6, pt['fps'], 100 * pt['hover'], pt['hover_gate_mm'], 100 * pt['seated'], 100 * pt['success'], 100 * pt['crash'], pt['err_mm']))
            S.stage('train1', 'running', 'GPU training (MuJoCo Warp), %d robots: %.1fM steps, %d/s, hover %.1f%%, docked %.2f%%' % (N, n / 1e6, pt['fps'], 100 * pt['hover'], 100 * pt['success']))
            if pt['hover'] > 0.30 and self.htol[0] > float(os.environ.get('HTOL_MIN', '0.003')) + 1e-4 and len(self.eps) > 2000:
                self.htol = (max(float(os.environ.get('HTOL_MIN', '0.003')), self.htol[0] * 0.75), max(math.radians(float(os.environ.get('HTOL_MIN_DEG', '2'))), self.htol[1] * 0.75)); self.training_env.set_attr('htol', self.htol); self.eps.clear()
                S.note('GPU: hover gate tightened to %.1f mm / %.1f deg' % (self.htol[0] * 1000, math.degrees(self.htol[1])))
            if n - self.last_save > 2_000_000:
                self.last_save = n; self.model.save(os.path.join(RUN, 'latest')); self.training_env.save(os.path.join(RUN, 'vecnorm.pkl'))
                pn = self.model.policy; Ws = {}
                lin = [l for l in pn.mlp_extractor.policy_net if hasattr(l, 'weight')] + [pn.action_net]
                for i, l in enumerate(lin): Ws['W%d' % i] = l.weight.detach().cpu().numpy(); Ws['b%d' % i] = l.bias.detach().cpu().numpy()
                Ws['mean'] = self.training_env.obs_rms.mean; Ws['var'] = self.training_env.obs_rms.var; Ws['steps'] = np.array(n)
                np.savez(os.path.join(RUN, 'brain_tmp.npz'), **Ws)
                for _try in range(40):
                    try: os.replace(os.path.join(RUN, 'brain_tmp.npz'), os.path.join(RUN, 'brain.npz')); break
                    except PermissionError: time.sleep(0.25)
    log('start from brain at %.2fM steps' % (start_steps / 1e6))
    model.learn(total_timesteps=TOTAL, callback=CB(), reset_num_timesteps=False)
