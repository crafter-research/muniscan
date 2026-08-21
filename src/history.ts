import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { Entity } from "./discover";

export function previousMunicipalities(dataDir: string, date: string): Entity[] {
  if (!existsSync(dataDir)) return [];
  const last = readdirSync(dataDir)
    .filter(
      (name) =>
        /^\d{4}-\d{2}-\d{2}$/.test(name) &&
        name < date &&
        existsSync(`${dataDir}/${name}/index.json`)
    )
    .sort()
    .at(-1);
  if (!last) return [];

  const rows = JSON.parse(readFileSync(`${dataDir}/${last}/index.json`, "utf8")).municipalidades ?? [];
  return rows.map((row: Entity) => ({
    slug: row.slug,
    nombre: row.nombre,
    poder: row.poder,
    fuente: row.fuente,
  }));
}

export function previousMunicipalityCount(dataDir: string, date: string): number | null {
  const rows = previousMunicipalities(dataDir, date);
  return rows.length > 0 ? rows.length : null;
}
