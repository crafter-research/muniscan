/**
 * Refuses to score a run that did not finish.
 *
 * The first scheduled run measured 1,495 municipalities against the previous
 * 1,794 and produced a diff claiming 386 closures and 1,056 index changes in a
 * single day. None of that happened: gob.pe had throttled the crawler and the
 * census came back short. Because every axis is normalised against the best
 * value in its own run, a short census also shifts every score, so the damage
 * was not limited to the missing rows.
 *
 * A partial run is not wrong data, it is absent data wearing the shape of data.
 * The pipeline is resumable, so the right response is to rerun the same date and
 * let it continue, never to publish what it managed to reach.
 */

import type { Enriched } from "./enrich";

/** How far below the previous run's count a census may fall before it is suspect. */
export const MAX_SHRINK = 0.05;

/** How much of a run may fail to answer before the run is suspect. */
export const MAX_ERROR_RATE = 0.05;

export type Check = {
  ok: boolean;
  reasons: string[];
  measured: { rows: number; answered: number; errorRate: number; previous: number | null };
};

export function checkCompleteness(
  rows: Enriched[],
  previousCount: number | null,
  declaredTotal: number | null
): Check {
  const answered = rows.filter((row) => row.http === 200).length;
  const errorRate = rows.length === 0 ? 1 : (rows.length - answered) / rows.length;
  const reasons: string[] = [];

  if (rows.length === 0) {
    reasons.push("the run produced no rows at all");
  }

  if (errorRate > MAX_ERROR_RATE) {
    reasons.push(
      `${(errorRate * 100).toFixed(1)}% of entities did not answer, above the ${(MAX_ERROR_RATE * 100).toFixed(0)}% this run tolerates`
    );
  }

  if (previousCount !== null && answered < previousCount * (1 - MAX_SHRINK)) {
    const drop = (((previousCount - answered) / previousCount) * 100).toFixed(1);
    reasons.push(
      `the census reached ${answered} entities against ${previousCount} last time, ${drop}% fewer; entities do not disappear at that rate, so the crawl is short`
    );
  }

  // Informational rather than blocking: gob.pe's declared figure moves on its
  // own, and the sweep has never reached all of it.
  if (declaredTotal && answered < declaredTotal * 0.8) {
    reasons.push(
      `only ${((answered / declaredTotal) * 100).toFixed(1)}% of the ${declaredTotal} entities gob.pe declares were reached`
    );
  }

  return {
    ok: reasons.length === 0,
    reasons,
    measured: { rows: rows.length, answered, errorRate, previous: previousCount },
  };
}

export function explain(check: Check): string {
  const { measured } = check;
  const lines = [
    `rows: ${measured.rows}, answered: ${measured.answered}, errors: ${(measured.errorRate * 100).toFixed(1)}%`,
  ];
  if (measured.previous !== null) lines.push(`previous run: ${measured.previous}`);
  for (const reason of check.reasons) lines.push(`  - ${reason}`);
  return lines.join("\n");
}
