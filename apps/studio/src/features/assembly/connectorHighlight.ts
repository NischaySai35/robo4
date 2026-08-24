/**
 * connectorHighlight — lets any panel briefly highlight a set of connector markers
 * in the live viewport (e.g. hover a snap-joint row → light up the two connectors
 * it links). ConnectorRenderer registers `set`; callers pass the pairs to glow and
 * an empty array to clear. Framework-only side never touches THREE.
 */
export interface ConnPair { bodyId: string; connectorId: string }

export const connectorHighlight: { set: (pairs: ConnPair[]) => void } = {
  set: () => {},
};
