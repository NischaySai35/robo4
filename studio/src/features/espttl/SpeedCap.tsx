/**
 * SpeedCap — the top speed of EVERY servo on EVERY module, in the ESP-TTL top line (Nischay 13 Nov 2026: "no servo,
 * whatever it is, may go above 30 % speed; default 30, I change it here"). The limit lives ON each board (saved, firmware
 * esp32_multi posEx/syncPosEx: sliders, animations, the Sync stream, home, locks) - this box only shows and sets it.
 * It always goes to ALL modules, whichever one is picked at the top. A module that disagrees is shown so you can fix it.
 * REUSE-CHECKED: speed|cap|limit -> per-move speed 1..10 in the Control/Animation tabs is a move's OWN speed; nothing set a
 * board-wide ceiling. Calls go through ttlTry (the shared module caller).
 */
import { useEffect, useState } from 'react';
import { ttlTry, nodeLabel } from '@/state/espTtlStore';
import { useEspNodesStore } from '@/state/espNodesStore';

export default function SpeedCap() {
  const nodes = useEspNodesStore(s => s.nodes);
  const online = nodes.filter(n => n.connected);
  const key = online.map(n => n.id).join(',');
  const [pct, setPct] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const read = async () => {
    const rs = await Promise.all(online.map(async n => ({ n, r: await ttlTry('/api/speedcap', 4000, n.url) })));
    const vals = rs.filter(x => x.r.ok && typeof x.r.data?.pct === 'number');
    if (!vals.length) { setPct(null); return; }
    const p = vals[0].r.data.pct; setPct(p); setDraft(String(p));
    const odd = vals.filter(x => x.r.data.pct !== p);
    setNote(odd.length ? `${odd.map(x => `${nodeLabel(x.n)} ${x.r.data.pct}%`).join(', ')} differ - press Enter to set all` : '');
  };
  useEffect(() => { void read(); }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    const v = Math.round(Number(draft));
    if (!Number.isFinite(v) || v < 5 || v > 100) { setNote('5 to 100 %'); setDraft(pct == null ? '' : String(pct)); return; }
    if (v > 50 && !confirm(`Allow every servo up to ${v} % speed? Fast moves hit harder.`)) { setDraft(String(pct ?? 30)); return; }
    setBusy(true);
    const rs = await Promise.all(online.map(async n => ({ n, r: await ttlTry(`/api/speedcap?pct=${v}`, 4000, n.url) })));
    const bad = rs.filter(x => !x.r.ok);
    setBusy(false);
    setNote(bad.length ? `not set on ${bad.map(x => nodeLabel(x.n)).join(', ')}` : '');
    await read();
  };

  return (
    <label className="ettl-chip ettl-speedcap" data-testid="ttl-speedcap"
      title="Top speed of every servo on every module (saved on each board). Default 30 %.">
      Max speed
      <input type="number" min={5} max={100} step={5} value={draft} disabled={busy || !online.length}
        placeholder="-" onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void apply(); if (e.key === 'Escape') setDraft(String(pct ?? '')); }}
        onBlur={() => { if (pct != null && draft !== String(pct)) void apply(); }} />
      %{note && <span className="ettl-speedcap-note">{note}</span>}
    </label>
  );
}
