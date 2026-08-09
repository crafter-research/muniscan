/**
 * Turns declared surface into a 0-100 index.
 *
 * Three axes, each a different question:
 *   presence  - does it publish what the law asks for? A legal floor, not an
 *               achievement, so it carries the least weight.
 *   adoption  - does it use the platforms the central state built for it?
 *   autonomy  - did it stand up anything of its own?
 *
 * A domain counts as central when it appears across a large share of the state;
 * adopting one says nothing about a particular entity. Everything else is only
 * "own" if it lives under the entity's own domain. That last rule matters more
 * than it looks: without it, the first version of this index ranked a
 * municipality first for linking out to Contraloria, MEF, PCM and Mininter
 * portals. Seventeen of its nineteen "own systems" belonged to other bodies.
 * The index was rewarding outbound links to other people's software, which is
 * the opposite of what it claims to measure.
 */

import type { Enriched } from "./enrich";

export const CENTRAL_THRESHOLD = 100;

export const WEIGHTS = { presence: 0.2, adoption: 0.35, autonomy: 0.45 } as const;

export type Scored = Enriched & {
  presencia: number;
  adopcion: number;
  autonomia: number;
  sistemas_propios: string[];
  sistemas_externos: number;
  plataformas_centrales: string[];
  indice: number;
  ranking?: number;
};

/** Domains shared by at least CENTRAL_THRESHOLD entities across the whole census. */
export function centralPlatforms(all: Enriched[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of all) {
    for (const domain of row.dominios ?? []) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= CENTRAL_THRESHOLD)
      .map(([domain]) => domain)
  );
}

/** Loose match: "muni-san-borja" should claim "www.munisanborja.gob.pe". */
function belongsTo(slug: string, domain: string): boolean {
  const base = slug.replaceAll("-", "");
  return domain.replaceAll("-", "").replaceAll(".", "").includes(base);
}

export function score(rows: Enriched[], central: Set<string>): Scored[] {
  const scored: Scored[] = rows.map((row) => {
    const domains = row.dominios ?? [];
    const centrales = domains.filter((domain) => central.has(domain));
    const rest = domains.filter((domain) => !central.has(domain));
    const propios = rest.filter((domain) => belongsTo(row.slug, domain));

    return {
      ...row,
      presencia: (row.tramites ? 1 : 0) + (row.normas ? 1 : 0),
      adopcion: centrales.length,
      autonomia: propios.length,
      sistemas_propios: propios,
      sistemas_externos: rest.length - propios.length,
      plataformas_centrales: centrales,
      indice: 0,
    };
  });

  // Normalise each axis against the best observed value, so the scale reflects
  // this run's population rather than a ceiling invented up front.
  const maxAdoption = Math.max(1, ...scored.map((row) => row.adopcion));
  const maxAutonomy = Math.max(1, ...scored.map((row) => row.autonomia));

  for (const row of scored) {
    row.indice =
      Math.round(
        1000 *
          (WEIGHTS.presence * (row.presencia / 2) +
            WEIGHTS.adoption * (row.adopcion / maxAdoption) +
            WEIGHTS.autonomy * (row.autonomia / maxAutonomy))
      ) / 10;
  }

  scored.sort((a, b) => b.indice - a.indice || a.nombre.localeCompare(b.nombre));
  scored.forEach((row, index) => {
    row.ranking = index + 1;
  });

  return scored;
}
