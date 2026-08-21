import type { Scored } from "./score";

export const SAMPLE_SIZE = 100;
export const SAMPLE_QUINTILES = 5;

export type HealthTarget = {
  sample_id: number;
  quintil: number;
  slug: string;
  nombre: string;
  ranking: number | null;
  indice: number;
  dominio: string;
  url: string;
};

export type HealthObservation = HealthTarget & {
  observed_at: string;
  reachable: boolean;
  http_status: number | null;
  final_url: string | null;
  elapsed_ms: number;
  error: string | null;
};

function spread<T>(rows: T[], count: number): T[] {
  if (count <= 0 || rows.length === 0) return [];
  if (rows.length <= count) return rows;
  if (count === 1) return rows[0] === undefined ? [] : [rows[0]];

  const selected: T[] = [];
  const used = new Set<number>();
  for (let index = 0; index < count; index++) {
    const position = Math.round((index * (rows.length - 1)) / (count - 1));
    const row = rows[position];
    if (!used.has(position) && row !== undefined) {
      selected.push(row);
      used.add(position);
    }
  }
  return selected;
}

export function selectHealthSample(rows: Scored[], size = SAMPLE_SIZE): HealthTarget[] {
  if (size < 1) throw new Error("sample size must be positive");
  if (size % SAMPLE_QUINTILES !== 0) {
    throw new Error(`sample size must be divisible by ${SAMPLE_QUINTILES}`);
  }

  const eligible = rows
    .filter((row) => row.sistemas_propios.length > 0)
    .sort(
      (a, b) =>
        (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER) ||
        a.slug.localeCompare(b.slug),
    );

  if (eligible.length < size) {
    throw new Error(
      `need ${size} municipalities with classified municipal systems, found ${eligible.length}`,
    );
  }

  const perQuintile = size / SAMPLE_QUINTILES;
  const selected: Array<Omit<HealthTarget, "sample_id">> = [];

  for (let quintile = 0; quintile < SAMPLE_QUINTILES; quintile++) {
    const start = Math.floor((quintile * eligible.length) / SAMPLE_QUINTILES);
    const end = Math.floor(((quintile + 1) * eligible.length) / SAMPLE_QUINTILES);
    const band = eligible.slice(start, end);

    for (const row of spread(band, perQuintile)) {
      const domain = [...row.sistemas_propios].sort()[0];
      if (!domain) throw new Error(`${row.slug} has no classified municipal domain`);
      selected.push({
        quintil: quintile + 1,
        slug: row.slug,
        nombre: row.nombre,
        ranking: row.ranking ?? null,
        indice: row.indice,
        dominio: domain,
        url: `https://${domain}/`,
      });
    }
  }

  if (selected.length !== size) {
    throw new Error(`expected ${size} selected sites, got ${selected.length}`);
  }

  return selected.map((row, index) => ({ sample_id: index + 1, ...row }));
}

export async function observeTarget(target: HealthTarget): Promise<HealthObservation> {
  const started = performance.now();
  try {
    const response = await fetch(target.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "muniscan-health-sample/0.1 (+https://github.com/crafter-research/muniscan)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    await response.body?.cancel().catch(() => undefined);
    return {
      ...target,
      observed_at: new Date().toISOString(),
      reachable: true,
      http_status: response.status,
      final_url: response.url,
      elapsed_ms: Math.round(performance.now() - started),
      error: null,
    };
  } catch (error) {
    return {
      ...target,
      observed_at: new Date().toISOString(),
      reachable: false,
      http_status: null,
      final_url: null,
      elapsed_ms: Math.round(performance.now() - started),
      error: (error instanceof Error ? error.message : String(error)).slice(0, 240),
    };
  }
}

export async function observeSample(
  targets: HealthTarget[],
  onProgress?: (done: number, total: number) => void,
): Promise<HealthObservation[]> {
  const observations: HealthObservation[] = [];
  for (const [index, target] of targets.entries()) {
    observations.push(await observeTarget(target));
    onProgress?.(index + 1, targets.length);
  }
  return observations;
}
