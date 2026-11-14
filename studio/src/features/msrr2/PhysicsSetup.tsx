/**
 * PhysicsSetup — the MSRR tab's real-physics check (Nischay 12 Nov 2026): this tab's docking / planner tests run in MuJoCo, a
 * Python program that not every computer has. If Python 3.12 + the pinned set (MuJoCo 3.12.0, numpy, scipy, mink) is missing
 * or a different version, a bar offers "Install MuJoCo"; the dev server pip-installs exactly that set and restarts the physics
 * service. Everything else in the Studio (Editor, Animation gravity, DIK + VSEPR connect) runs on its own in-browser physics
 * (Jolt) and never needs this.
 * REUSE-CHECKED: install|mujoco|__physics -> studio/tools/vite-plugin-physics.cjs (starts the service, /__physics/ensure);
 * nothing checked versions or installed. The check/install endpoints are there; this is only the bar that calls them.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Check = { python: boolean; ok: boolean; have?: Record<string, string | null>; need: Record<string, string>; wrong?: string[]; error?: string; installing?: boolean };

export default function PhysicsSetup() {
  const [c, setC] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const check = async () => {
    try { const r = await fetch('/__physics/check', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); setC(j); if (j.installing) setBusy(true); } }
    catch { /* the installed app or a static build: no dev server endpoints, nothing to show */ }
  };
  useEffect(() => { void check(); }, []);
  if (!c || (c.ok && !msg)) return null;
  const install = async () => {
    setBusy(true); setMsg('Installing MuJoCo and its helpers - this takes 1 to 3 minutes the first time…');
    try {
      const r = await (await fetch('/__physics/install', { method: 'POST' })).json();
      setMsg(r.ok ? 'MuJoCo installed - the physics service restarted on it. Real physics is ready.' : `Install failed. ${String(r.tail || '').slice(-300)}`);
      setC(r.check ?? c);
    } catch (e: any) { setMsg(`Install failed: ${e?.message || e}`); }
    setBusy(false);
  };
  const what = !c.python ? 'Python 3.12 is not installed on this computer'
    : `Real physics (MuJoCo) is ${c.wrong?.includes('mujoco') && !c.have?.mujoco ? 'not installed' : 'a different version'} on this computer`;
  return (
    <div data-testid="physics-setup" data-ui="a" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', margin: '6px 0',
      border: '1px solid var(--warn)', borderRadius: 6, background: 'var(--overlay-bg)', color: 'var(--text)', fontSize: 12 }}>
      {msg ? <span>{msg}</span> : <>
        <span><b style={{ color: 'var(--warn)' }}>{what}.</b> This tab's docking and planner tests need it; the rest of the Studio uses its own built-in physics.
          {c.python && c.wrong?.length ? <> Needs {c.wrong.map((k) => `${k} ${c.need[k]}${c.have?.[k] ? ` (has ${c.have[k]})` : ''}`).join(', ')}.</> : null}</span>
        {c.python
          ? <Button size="sm" disabled={busy} onClick={install}>{busy ? 'Installing…' : 'Install MuJoCo'}</Button>
          : <a href="https://www.python.org/downloads/release/python-3120/" target="_blank" rel="noreferrer">Get Python 3.12, then reload</a>}
      </>}
      {msg && !busy && <Button size="xs" variant="outline" onClick={() => { setMsg(''); void check(); }}>OK</Button>}
    </div>
  );
}
