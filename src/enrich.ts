/**
 * Reads each entity's institutional page and records the surface it declares.
 *
 * The useful signal turned out to be the outbound .gob.pe links: an entity
 * publishes its own subsystems there, so a plain GET yields the systems it
 * runs without guessing at hostnames.
 *
 * Results are appended to JSONL one row at a time. An earlier version held
 * everything in memory and wrote once at the end, and killing it after gob.pe
 * blocked us threw away 1,600 already-fetched rows. Appending per row also
 * makes the run resumable: rerunning skips whatever the file already holds.
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { get, sleep, waitUntilUnblocked, DELAY_MS } from "./fetch";
import type { Entity } from "./discover";

export type Enriched = Entity & {
  http: number | string;
  bytes?: number;
  dominios?: string[];
  tramites?: boolean;
  normas?: boolean;
  transparencia?: boolean;
};

export function readDone(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const slugs = new Set<string>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      slugs.add(JSON.parse(line).slug);
    } catch {
      // A truncated final line means the previous run was killed mid-write.
      // Skipping it re-fetches that one entity, which is cheaper than failing.
    }
  }
  return slugs;
}

export function parsePage(entity: Entity, html: string): Enriched {
  const domains = new Set<string>();
  for (const match of html.matchAll(/href="https?:\/\/([a-z0-9.-]+\.gob\.pe)\//g)) {
    const host = match[1];
    if (host && host !== "www.gob.pe" && host !== "gob.pe") domains.add(host);
  }

  return {
    ...entity,
    http: 200,
    bytes: html.length,
    dominios: [...domains].sort(),
    tramites: html.includes("/tramites-y-servicios"),
    normas: html.includes("/normas-legales"),
    transparencia: /transparencia/i.test(html),
  };
}

export async function enrichAll(
  entities: Entity[],
  outPath: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const done = readDone(outPath);
  const pending = entities.filter((entity) => !done.has(entity.slug));

  for (const [index, entity] of pending.entries()) {
    let result = await get(`https://www.gob.pe/${entity.slug}`);

    if (!result.ok && result.blocked) {
      if (!(await waitUntilUnblocked())) {
        throw new Error("gob.pe stayed blocked for an hour; stopping with partial output");
      }
      result = await get(`https://www.gob.pe/${entity.slug}`);
    }

    const row: Enriched = result.ok
      ? parsePage(entity, result.body)
      : { ...entity, http: `ERR:${result.error}` };

    appendFileSync(outPath, `${JSON.stringify(row)}\n`);
    onProgress?.(index + 1, pending.length);
    await sleep(DELAY_MS);
  }
}
