/**
 * Enumerates the entities gob.pe knows about.
 *
 * gob.pe offers two views of its own directory and they disagree. The tree at
 * /estado/{branch} lists entities the search backend never returns, and the
 * search backend returns thousands the tree omits (municipalities above all:
 * /estado/gobiernos-locales renders zero over plain HTTP). Neither contains the
 * other, so the census is their union.
 *
 * The search backend also does not order results deterministically. Refetching
 * one sheet returns a different slice, so sheets overlap and a straight
 * 1..ceil(total/25) sweep silently returns duplicates and misses entities.
 * Instead: oversample, dedupe by slug, and stop once a run of sheets adds
 * nothing new. Measured on 2026-08-08, that saturated at sheet 185.
 */

import { get, sleep, DELAY_MS } from "./fetch";

const SEARCH = "https://www.gob.pe/busquedas.json?contenido%5B%5D=instituciones&sheet=";
const BRANCHES = [
  "poder-ejecutivo",
  "poder-legislativo",
  "poder-judicial",
  "organismos-autonomos",
  "gobiernos-regionales",
  "gobiernos-locales",
] as const;

/** Sheets in a row that may add nothing before the sweep is considered done. */
const DRY_STREAK_LIMIT = 40;
const MAX_SHEETS = 400;

export type Entity = {
  slug: string;
  nombre: string;
  poder: string | null;
  fuente: "search" | "tree" | "both";
};

type SearchResult = { url: string | null; name_with_parent: string | null };

function slugFromHref(html: string | null): string | null {
  if (!html) return null;
  return html.match(/href="\/([^"/]+)"/)?.[1] ?? null;
}

async function sheet(n: number): Promise<SearchResult[] | "blocked"> {
  const result = await get(`${SEARCH}${n}`);
  if (!result.ok) return result.blocked ? "blocked" : [];
  try {
    return JSON.parse(result.body).data.attributes.results ?? [];
  } catch {
    return [];
  }
}

/** Total the backend claims, used to report coverage rather than to bound the sweep. */
export async function declaredTotal(): Promise<number | null> {
  const result = await get("https://www.gob.pe/busquedas?contenido[]=instituciones");
  if (!result.ok) return null;
  const match = result.body.match(/"instituciones":(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function sweepSearch(
  onProgress?: (sheetNumber: number, found: number) => void
): Promise<Map<string, Entity>> {
  const found = new Map<string, Entity>();
  let dryStreak = 0;

  for (let n = 1; n <= MAX_SHEETS; n++) {
    const results = await sheet(n);
    if (results === "blocked") throw new Error("blocked while sweeping search");

    let fresh = 0;
    for (const result of results) {
      const slug = slugFromHref(result.url);
      if (!slug || found.has(slug)) continue;
      found.set(slug, {
        slug,
        nombre: result.name_with_parent ?? slug,
        poder: null,
        fuente: "search",
      });
      fresh++;
    }

    dryStreak = fresh === 0 ? dryStreak + 1 : 0;
    onProgress?.(n, found.size);
    if (dryStreak >= DRY_STREAK_LIMIT) break;

    await sleep(DELAY_MS);
  }

  return found;
}

/**
 * The branch pages render their entity links with JavaScript, so plain HTTP
 * returns a shell. Anything recovered here is a bonus on top of the sweep, not
 * the backbone of the census.
 */
export async function scrapeTree(): Promise<Map<string, Entity>> {
  const found = new Map<string, Entity>();

  for (const branch of BRANCHES) {
    const result = await get(`https://www.gob.pe/estado/${branch}`);
    if (result.ok) {
      for (const match of result.body.matchAll(/href="\/([a-z0-9][a-z0-9-]{2,60})"/g)) {
        const slug = match[1];
        if (slug && !found.has(slug)) {
          found.set(slug, { slug, nombre: slug, poder: branch, fuente: "tree" });
        }
      }
    }
    await sleep(DELAY_MS);
  }

  return found;
}

export function merge(
  search: Map<string, Entity>,
  tree: Map<string, Entity>
): Entity[] {
  const merged = new Map(search);

  for (const [slug, entity] of tree) {
    const existing = merged.get(slug);
    if (existing) merged.set(slug, { ...existing, poder: entity.poder, fuente: "both" });
    else merged.set(slug, entity);
  }

  return [...merged.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function isMunicipality(entity: Entity): boolean {
  return entity.slug.startsWith("muni") || /municipalidad/i.test(entity.nombre);
}
