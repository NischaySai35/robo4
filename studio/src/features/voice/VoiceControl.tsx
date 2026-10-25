import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from './voiceStore';
import { speak, stopSpeaking, downloadVoiceModel, PIPER_VOICE } from './speech';
import { BATT_WARN_V, BATT_EMPTY_V } from './battery';

/** Header speaker button + a small settings popover (on/off, voice download, volume, test). */
export default function VoiceControl() {
  const S = useVoiceStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', away);
    return () => window.removeEventListener('mousedown', away);
  }, [open]);

  const status =
    S.model === 'downloading' ? `Downloading voice… ${(S.progress * 100).toFixed(0)}%`
    : S.model === 'ready'     ? 'Ryan (US male) ready — works offline'
    : S.model === 'error'     ? `Voice download failed — using the system voice${S.error ? ` (${S.error})` : ''}`
    : S.model === 'missing'   ? 'Ryan voice not downloaded — using the system voice'
    : 'Checking voice…';

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button
        className="app-status-chip" style={{ cursor: 'pointer' }}
        title={S.enabled ? 'Voice feedback on' : 'Voice feedback off'}
        onClick={() => setOpen(o => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" opacity={S.enabled ? 1 : 0.45}>
          <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
          {S.enabled
            ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>
            : <path d="m16 9 6 6m0-6-6 6" />}
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 300, zIndex: 50,
          background: 'var(--panel, #11182a)', border: '1px solid var(--border, #2a3550)',
          borderRadius: 8, padding: 12, display: 'grid', gap: 10, fontSize: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,.45)',
        }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={S.enabled}
                   onChange={e => { S.set({ enabled: e.target.checked }); if (!e.target.checked) stopSpeaking(); }} />
            Speak what happens (connect, buttons, OTA)
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={S.battery} onChange={e => S.set({ battery: e.target.checked })} />
            Battery warnings ({BATT_WARN_V.toFixed(1)} V, then every 0.1 V; 0% = {BATT_EMPTY_V.toFixed(1)} V)
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            Volume
            <input type="range" min={0} max={1} step={0.05} value={S.volume} style={{ flex: 1 }}
                   onChange={e => S.set({ volume: Number(e.target.value) })} />
          </div>
          <div style={{ opacity: 0.8 }}>{status}</div>
          {S.model === 'downloading' && (
            <div style={{ height: 6, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${S.progress * 100}%`, background: '#3b82f6' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {(S.model === 'missing' || S.model === 'error') && (
              <button onClick={() => void downloadVoiceModel()}>Download voice ({PIPER_VOICE.replace('en_US-', '')})</button>
            )}
            <button onClick={() => speak('Module detected, connected!', { key: 'test', cooldownMs: 0, urgent: true })}>Test voice</button>
          </div>
        </div>
      )}
    </div>
  );
}
