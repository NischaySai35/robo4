/**
 * ModuleStrip — every module board as a pill, sorted by module number, plus "+ Board".
 *
 * Shared by the Servos page (click the name: change the address) and the ESP-TTL page (pass `selectedId` + `onSelect`:
 * click picks the module the page shows, double-click changes its address). Modules the radio gateway hears are added
 * by espPoll on their own; "+ Board" is for a board typed in by hand (an IP, or modN.local).
 * REUSE-CHECKED: NodePill|nodes-strip|addNode -> was NodePill inside ServoController.tsx; moved here, not copied.
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEspNodesStore, type EspNode } from '@/state/espNodesStore';
import { moduleNumber } from './espPoll';
import './ModuleStrip.css';

/** The nodes in module order (mod1, mod2, ...). */
export function sortedNodes(nodes: EspNode[]): EspNode[] {
  return nodes.map((n, i) => ({ n, k: moduleNumber(n.url, n.name, i) })).sort((a, b) => a.k - b.k).map(x => x.n);
}

function NodePill({ nd, canRemove, selected, onSelect }: { nd: EspNode; canRemove: boolean; selected?: boolean; onSelect?: () => void }) {
  const updateNode = useEspNodesStore(s => s.updateNode);
  const removeNode = useEspNodesStore(s => s.removeNode);
  const [edit, setEdit] = useState<string | null>(null);
  const commit = () => { if (edit != null && edit.trim() && edit.trim() !== nd.url) updateNode(nd.id, { url: edit.trim() }); setEdit(null); };
  return (
    <div className={`sc-node-pill${selected ? ' sel' : ''}${nd.connected ? '' : ' off'}`}
         title={`${nd.url} · ${nd.connected ? 'online' : 'offline'} · ${onSelect ? 'click: send only to this module (click again: all modules) - double-click: change the address' : 'click to change the address'}`}>
      <span className={`sc-dot ${nd.connected ? 'ok' : 'bad'}`} />
      {edit != null ? (
        <Input size="xs" className="tw:w-[150px]" autoFocus value={edit} spellCheck={false}
               onChange={e => setEdit(e.target.value)} onBlur={commit}
               onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEdit(null); }} />
      ) : (
        <button className="sc-node-name" onClick={() => (onSelect ? onSelect() : setEdit(nd.url))}
                onDoubleClick={() => onSelect && setEdit(nd.url)}>
          {nd.name}{nd.connected && nd.latencyMs != null ? ` · ${nd.latencyMs}ms` : ''}
        </button>
      )}
      {canRemove && (
        <button className="sc-node-del" aria-label={`Remove ${nd.name}`} title={`Remove ${nd.name}`}
                onClick={() => { if (confirm(`Remove ${nd.name} (${nd.url})?`)) removeNode(nd.id); }}>×</button>
      )}
    </div>
  );
}

export default function ModuleStrip({ selectedId, onSelect }: { selectedId?: string | null; onSelect?: (id: string) => void }) {
  const nodes = sortedNodes(useEspNodesStore(s => s.nodes));
  const addNode = useEspNodesStore(s => s.addNode);
  const [typing, setTyping] = useState<string | null>(null);
  const add = () => {
    const u = (typing ?? '').trim(); setTyping(null);
    if (!u) return;
    const url = /^https?:\/\//i.test(u) ? u : `http://${u}`;
    const id = addNode({ url, name: /mod(\d+)/i.test(url) ? `Module ${/mod(\d+)/i.exec(url)![1]}` : url.replace(/^https?:\/\//i, '') });
    onSelect?.(id);
  };
  return (
    <div className="sc-nodes-strip">
      {nodes.map(nd => <NodePill key={nd.id} nd={nd} canRemove={nodes.length > 1}
                                 selected={selectedId === nd.id} onSelect={onSelect && (() => onSelect(nd.id))} />)}
      {typing != null ? (
        <Input size="xs" className="tw:w-[170px]" autoFocus value={typing} spellCheck={false} placeholder="IP or mod3.local, Enter"
               onChange={e => setTyping(e.target.value)} onBlur={add}
               onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setTyping(null); }} />
      ) : (
        <Button variant="outline" size="xs" onClick={() => setTyping('')} title="Add a module board by its address (modules the radio hears appear by themselves)">+ Board</Button>
      )}
    </div>
  );
}
