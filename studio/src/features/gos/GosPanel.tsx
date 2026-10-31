/** GosPanel — connect the Studio to a running GOS script, and see whether it is connected. */
import { useState } from 'react';
import { connectGos, disconnectGos, useGosStore } from './gosLink';

const COLOUR = { off: 'var(--text-dim)', connecting: 'var(--warn)', on: 'var(--success)', error: 'var(--danger)' };

export default function GosPanel() {
  const { status, message } = useGosStore();
  const [url, setUrl] = useState('ws://127.0.0.1:8772');
  const [token, setToken] = useState('');
  const box: React.CSSProperties = { width: '100%', padding: '4px 6px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 8 };
  return (
    <div style={{ padding: 12, fontSize: 12, color: 'var(--text)' }}>
      <p data-testid="gos-status" style={{ color: COLOUR[status], marginBottom: 10 }}>{message}</p>
      <label>Address<input style={box} value={url} onChange={(e) => setUrl(e.target.value)} /></label>
      <label>Token (the script prints it)<input style={box} value={token} onChange={(e) => setToken(e.target.value)} /></label>
      {status === 'on'
        ? <button className="msrr-btn" onClick={disconnectGos}>Disconnect</button>
        : <button className="msrr-btn primary" data-testid="gos-connect" onClick={() => connectGos(url.trim(), token.trim())}>Connect</button>}
    </div>
  );
}
