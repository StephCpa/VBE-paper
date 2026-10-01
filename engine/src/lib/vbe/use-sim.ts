import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { STRATEGIES, type StrategyName } from "./robots.ts";
import type { RoundSnapshot } from "./types.ts";

export function useSim(strategy: StrategyName, seed = 7, playing = true) {
  const run = useMemo(
    () => runPopulation(seed, STRATEGIES[strategy], DEFAULT_PARAMS, true),
    [strategy, seed],
  );
  const [t, setT] = useState(1);
  useEffect(() => {
    setT(1);
  }, [strategy, seed]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((x) => (x >= DEFAULT_PARAMS.T ? 1 : x + 1));
    }, 700);
    return () => window.clearInterval(id);
  }, [playing, strategy, seed]);
  const snap: RoundSnapshot | undefined = run.rounds[t - 1];
  return { run, t, setT, snap };
}
