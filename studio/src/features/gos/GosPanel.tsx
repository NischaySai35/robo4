/** GosPanel — connect the Studio to a running GOS script, and see whether it is connected. */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { connectGos, disconnectGos, useGosStore } from './gosLink';

const COLOUR = { off: 'var(--text-dim)', connecting: 'var(--warn)', on: 'var(--success)', error: 'var(--danger)' };

export default function GosPanel() {
  const { status, message } = useGosStore();
  const [url, setUrl] = useState('ws://127.0.0.1:8772');
  const [token, setToken] = useState('');
  return (
    <div data-ui="a" style={{ padding: 12, fontSize: 12, color: 'var(--text)' }}>
      <p data-testid="gos-status" style={{ color: COLOUR[status], marginBottom: 10 }}>{message}</p>
      <label>Address<Input className="tw:mb-2" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
      <label>Token (the script prints it)<Input className="tw:mb-2" value={token} onChange={(e) => setToken(e.target.value)} /></label>
      {status === 'on'
        ? <Button variant="outline" size="sm" onClick={disconnectGos}>Disconnect</Button>
        : <Button size="sm" data-testid="gos-connect" onClick={() => connectGos(url.trim(), token.trim())}>Connect</Button>}
    </div>
  );
}
