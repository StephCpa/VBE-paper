export type BuyerProbe = {
  giveCheck: boolean;
  giveChits: 0 | 1;
  requireChit: boolean;
};

export type BeliefProbe = {
  expectedAcceptors: number;
  expectedPeerForecast: number;
};

function jsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing JSON object");
  const value = JSON.parse(match[0]) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("response is not a JSON object");
  }
  return value as Record<string, unknown>;
}

export function parseBuyerProbe(text: string): BuyerProbe {
  const obj = jsonObject(text);
  if (typeof obj.giveCheck !== "boolean") throw new Error("giveCheck must be boolean");
  if (obj.giveChits !== 0 && obj.giveChits !== 1) throw new Error("giveChits must be 0 or 1");
  if (typeof obj.requireChit !== "boolean") throw new Error("requireChit must be boolean");
  return {
    giveCheck: obj.giveCheck,
    giveChits: obj.giveChits,
    requireChit: obj.requireChit,
  };
}

export function parseBeliefProbe(text: string): BeliefProbe {
  const obj = jsonObject(text);
  for (const key of ["expectedAcceptors", "expectedPeerForecast"] as const) {
    const value = obj[key];
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 6) {
      throw new Error(`${key} must be an integer from 0 to 6`);
    }
  }
  return {
    expectedAcceptors: Number(obj.expectedAcceptors),
    expectedPeerForecast: Number(obj.expectedPeerForecast),
  };
}

export function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

