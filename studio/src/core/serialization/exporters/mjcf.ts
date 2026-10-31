/** mjcf.ts — MJCF export. The exporter itself is in the GOS core (gos/core/src/mjcf.rs), shared with Python. */
import type { Document } from '@/core/model/index';
import { exportMjcf, type MjcfPackage } from '@/core/gos/graphCore';

export type { MjcfPackage };
export const exportMJCFPackage = (doc: Document, name = 'tetrobot'): MjcfPackage => exportMjcf(doc, name);
export const exportMJCF = (doc: Document, name = 'tetrobot') => exportMjcf(doc, name).xml;
