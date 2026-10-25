/** Battery scale shared by the header chip and the low-voltage voice warnings. */
export const BATT_EMPTY_V = 10.5;   // 0 %
export const BATT_FULL_V  = 12.6;   // 100 %
/** Start warning below this; then again for every further 0.1 V of sag. */
export const BATT_WARN_V  = 10.6;

export const batteryPct = (v: number) =>
  Math.max(0, Math.min(100, (v - BATT_EMPTY_V) / (BATT_FULL_V - BATT_EMPTY_V) * 100));

/** The 0.1 V step a voltage sits in, rounded UP: 10.57 V -> 10.6, 10.49 V -> 10.5. */
export const warnLevel = (v: number) => Math.round(Math.ceil(v * 10 - 1e-9)) / 10;
