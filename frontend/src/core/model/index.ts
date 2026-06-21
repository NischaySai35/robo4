/**
 * core/model — the TETROBOT graph model (DDL). Framework-free source of truth.
 * Internal imports are relative (core/ is a self-contained library); the rest of
 * the app reaches it via '@/core/model'.
 */
export * from './entities';
export * from './graph';
export * from './builders';
