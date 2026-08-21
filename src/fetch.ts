/**
 * Every request to gob.pe goes through here.
 *
 * The portal answers HTTP 418 with an "Acceso restringido" page when it sees
 * concurrency, and the block covers the whole domain rather than the endpoint
 * that triggered it. Measured on 2026-08-08: it clears after roughly fourteen
 * minutes, and a single sequential worker pausing 0.7s between requests ran
 * 3,121 pages without ever tripping it.
 *
 * So this module is deliberately serial. Adding a worker pool here is the one
 * change that will break the whole pipeline.
 */

const UA =
  "muniscan/0.1 (+https://github.com/crafter-research/muniscan) research crawler";

export const DELAY_MS = 700;
export const BLOCK_MARKER = "Acceso restringido";

export type FetchResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number | null; error: string; blocked: boolean };

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function get(url: string, timeoutMs = 30_000): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();

    if (isBlocked(body)) {
      return { ok: false, status: response.status, error: BLOCK_MARKER, blocked: true };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}`,
        blocked: false,
      };
    }
    return { ok: true, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.name : String(error),
      blocked: false,
    };
  }
}

export function isBlocked(body: string): boolean {
  return body.slice(0, 2000).includes(BLOCK_MARKER);
}

/**
 * Blocks until gob.pe serves a known-good page again.
 *
 * Probes a stable ministry page rather than the endpoint being crawled, so a
 * single broken slug is never mistaken for a site-wide block.
 */
export async function waitUntilUnblocked(maxWaitMs = 60 * 60_000): Promise<boolean> {
  const probe = "https://www.gob.pe/vivienda";
  let waited = 0;

  while (waited < maxWaitMs) {
    const result = await get(probe, 20_000);
    if (result.ok && result.status === 200) return true;

    await sleep(60_000);
    waited += 60_000;
    console.error(`[fetch] still blocked, waited ${waited / 1000}s`);
  }
  return false;
}
