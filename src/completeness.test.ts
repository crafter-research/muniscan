import { describe, expect, test } from "bun:test";
import { checkCompleteness, MAX_SHRINK } from "./completeness";
import type { Enriched } from "./enrich";

function rows(count: number, http: number | string = 200): Enriched[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `muni${index}`,
    nombre: `muni${index}`,
    poder: null,
    fuente: "search" as const,
    http,
    dominios: [],
  }));
}

describe("checkCompleteness", () => {
  test("a full run against a comparable previous one passes", () => {
    expect(checkCompleteness(rows(1794), 1794, null).ok).toBe(true);
  });

  test("the first run has nothing to compare against and passes", () => {
    expect(checkCompleteness(rows(1794), null, null).ok).toBe(true);
  });

  test("normal churn stays under the shrink limit", () => {
    const slightlySmaller = Math.floor(1794 * (1 - MAX_SHRINK / 2));
    expect(checkCompleteness(rows(slightlySmaller), 1794, null).ok).toBe(true);
  });

  test("the run that actually shipped a false delta is rejected", () => {
    // 2026-08-09: gob.pe throttled the crawler, the census came back at 1,495
    // against 1,794, and the diff claimed 386 closures in one day.
    const check = checkCompleteness(rows(1495), 1794, null);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("the crawl is short");
  });

  test("a census that mostly failed to answer is rejected", () => {
    const mixed = [...rows(900), ...rows(900, "ERR:TimeoutError")];
    const check = checkCompleteness(mixed, null, null);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("did not answer");
  });

  test("an empty run is rejected", () => {
    expect(checkCompleteness([], null, null).ok).toBe(false);
  });

  test("reaching far less than gob.pe declares is flagged", () => {
    const check = checkCompleteness(rows(1000), null, 3684);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("gob.pe declares");
  });

  test("the measurement is reported whether or not it passes", () => {
    const check = checkCompleteness(rows(1495), 1794, null);
    expect(check.measured).toEqual({
      rows: 1495,
      answered: 1495,
      errorRate: 0,
      previous: 1794,
    });
  });
});
