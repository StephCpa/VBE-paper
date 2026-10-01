export type VbeParams = {
  n: number;
  T: number;
  R: number;
  q: number;
  B: number;
  M: number;
  pHard: number;
  pPartner: number;
  v: number;
  K: number;
};

/** Frozen after robot calibration. Do not silently retune. */
export const DEFAULT_PARAMS: VbeParams = {
  n: 8,
  T: 24,
  R: 3,
  q: 0.4,
  B: 1,
  M: 4,
  pHard: 0.32,
  pPartner: 0.93,
  v: 0.5,
  K: 4,
};

export const CHIT_NAME = "mark";
export const CHIT_NAME_PLURAL = "marks";
