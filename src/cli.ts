/**
 * muniscan — scan, score, diff.
 *
 * A run writes to data/YYYY-MM-DD/ and never touches an earlier one. Runs are
 * immutable so a published DOI keeps pointing at the numbers that were actually
 * measured that day.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  declaredTotal,
  sweepSearch,
  scrapeTree,
  merge,
  restoreKnownMunicipalities,
  isMunicipality,
} from "./discover";
import { enrichAll, readDone, type Enriched } from "./enrich";
import { centralPlatforms, score, type Scored } from "./score";
import { diff, formatDelta } from "./diff";
import { checkCompleteness, explain } from "./completeness";
import { previousMunicipalities, previousMunicipalityCount } from "./history";

const DATA = "data";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function runDir(date: string): string {
  const dir = `${DATA}/${date}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return [];
      }
    });
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);
}

async function scan(date: string): Promise<void> {
  const dir = runDir(date);
  const total = await declaredTotal();
  console.log(`gob.pe declares ${total ?? "unknown"} institutions`);

  console.log("sweeping search backend (stops once sheets stop adding anything)...");
  const search = await sweepSearch((sheet, found) => {
    if (sheet % 25 === 0) console.log(`  sheet ${sheet}: ${found} unique`);
  });

  console.log("reading branch tree...");
  const tree = await scrapeTree();

  const discovered = merge(search, tree);
  const restored = restoreKnownMunicipalities(discovered, previousMunicipalities(DATA, date));
  const all = restored.entities;
  const municipalities = all.filter(isMunicipality);
  writeJson(`${dir}/entities.json`, {
    fecha: date,
    declarado_por_gobpe: total,
    entidades: all.length,
    municipalidades: municipalities.length,
    entidades_descubiertas: discovered.length,
    municipalidades_recuperadas_del_censo_anterior: restored.restored,
    cobertura_pct: total ? Math.round((1000 * all.length) / total) / 10 : null,
    lista: all,
  });
  console.log(
    `${all.length} entities, ${municipalities.length} municipalities ` +
      `(${restored.restored} restored from previous census)`
  );

  const enrichedPath = `${dir}/enriched.jsonl`;
  const alreadyDone = readDone(enrichedPath).size;
  if (alreadyDone > 0) console.log(`resuming: ${alreadyDone} rows already fetched`);

  console.log("enriching (one request at a time, this takes a while)...");
  await enrichAll(all, enrichedPath, (done, pending) => {
    if (done % 100 === 0) console.log(`  ${done}/${pending}`);
  });

  console.log(`done: ${dir}/enriched.jsonl`);
}

function buildIndex(date: string, force = false): void {
  const dir = runDir(date);
  const rows = readJsonl<Enriched>(`${dir}/enriched.jsonl`);
  if (rows.length === 0) throw new Error(`no enriched rows in ${dir}; run scan first`);

  const answered = rows.filter((row) => row.http === 200);
  // The central-platform threshold is measured against the whole census, not
  // against municipalities alone, so "central" means central to the state.
  const central = centralPlatforms(answered);
  const municipalities = answered.filter((row) =>
    isMunicipality({ slug: row.slug, nombre: row.nombre, poder: row.poder, fuente: row.fuente })
  );
  const check = checkCompleteness(municipalities, previousMunicipalityCount(DATA, date), null);
  if (!check.ok) {
    console.error(`this run looks incomplete:\n${explain(check)}`);
    if (!force) {
      throw new Error(
        "refusing to score an incomplete census. Rerun `scan` for the same date to resume, " +
          "or pass --force if you have confirmed the drop is real."
      );
    }
    console.error("scoring anyway because --force was passed");
  }

  const scored = score(municipalities, central);

  writeJson(`${dir}/index.json`, {
    fecha: date,
    metodo: "https://github.com/crafter-research/muniscan/blob/main/METHOD.md",
    limitaciones: "https://github.com/crafter-research/muniscan/blob/main/LIMITATIONS.md",
    plataformas_centrales: [...central].sort(),
    resumen: {
      municipalidades: scored.length,
      con_sistema_propio: scored.filter((row) => row.autonomia > 0).length,
      sin_nada: scored.filter((row) => row.indice === 0).length,
      mediana: scored[Math.floor(scored.length / 2)]?.indice ?? null,
    },
    municipalidades: scored,
  });

  console.log(`${scored.length} municipalities scored -> ${dir}/index.json`);
  for (const row of scored.slice(0, 10)) {
    console.log(`  ${row.ranking}. ${row.indice}  ${row.nombre}`);
  }
}

function compare(beforeDate: string, afterDate: string): void {
  const read = (date: string): Scored[] => {
    const path = `${DATA}/${date}/index.json`;
    if (!existsSync(path)) throw new Error(`missing ${path}`);
    return JSON.parse(readFileSync(path, "utf8")).municipalidades;
  };

  const delta = diff(read(beforeDate), read(afterDate));
  writeJson(`${DATA}/${afterDate}/diff.json`, { desde: beforeDate, hasta: afterDate, ...delta });
  writeFileSync(`${DATA}/${afterDate}/DELTA.md`, formatDelta(delta, afterDate));
  console.log(formatDelta(delta, afterDate));
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "scan":
    await scan(args[0] ?? today());
    break;
  case "score":
    buildIndex(
      args.find((arg) => !arg.startsWith("--")) ?? today(),
      args.includes("--force")
    );
    break;
  case "diff":
    if (args.length < 2) throw new Error("usage: diff <before-date> <after-date>");
    compare(args[0]!, args[1]!);
    break;
  default:
    console.log(
      [
        "muniscan",
        "",
        "  scan [date]            discover and enrich; resumable, safe to rerun",
        "  score [date] [--force] build the index from a scan; refuses an incomplete census",
        "  diff <before> <after>  compare two runs",
      ].join("\n")
    );
}
