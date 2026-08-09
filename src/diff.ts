/**
 * Compares two runs.
 *
 * A single run is a photograph. What makes this an observatory is being able to
 * say what changed since the last one: which entities appeared, which stopped
 * answering, and which moved. The monthly job opens a pull request carrying
 * this diff so a human reads the delta before it is published.
 */

import type { Scored } from "./score";

export type Delta = {
  altas: Array<{ slug: string; nombre: string; indice: number }>;
  bajas: Array<{ slug: string; nombre: string; indice: number }>;
  movimientos: Array<{
    slug: string;
    nombre: string;
    antes: number;
    ahora: number;
    cambio: number;
    sistemas_nuevos: string[];
  }>;
  resumen: {
    antes: number;
    ahora: number;
    altas: number;
    bajas: number;
    subieron: number;
    bajaron: number;
    sin_cambio: number;
  };
};

export function diff(before: Scored[], after: Scored[], minChange = 0.1): Delta {
  const previous = new Map(before.map((row) => [row.slug, row]));
  const current = new Map(after.map((row) => [row.slug, row]));

  const altas = after
    .filter((row) => !previous.has(row.slug))
    .map(({ slug, nombre, indice }) => ({ slug, nombre, indice }));

  const bajas = before
    .filter((row) => !current.has(row.slug))
    .map(({ slug, nombre, indice }) => ({ slug, nombre, indice }));

  const movimientos: Delta["movimientos"] = [];
  let unchanged = 0;

  for (const row of after) {
    const old = previous.get(row.slug);
    if (!old) continue;

    const change = Math.round((row.indice - old.indice) * 10) / 10;
    if (Math.abs(change) < minChange) {
      unchanged++;
      continue;
    }

    const known = new Set(old.sistemas_propios);
    movimientos.push({
      slug: row.slug,
      nombre: row.nombre,
      antes: old.indice,
      ahora: row.indice,
      cambio: change,
      sistemas_nuevos: row.sistemas_propios.filter((domain) => !known.has(domain)),
    });
  }

  movimientos.sort((a, b) => Math.abs(b.cambio) - Math.abs(a.cambio));

  return {
    altas,
    bajas,
    movimientos,
    resumen: {
      antes: before.length,
      ahora: after.length,
      altas: altas.length,
      bajas: bajas.length,
      subieron: movimientos.filter((row) => row.cambio > 0).length,
      bajaron: movimientos.filter((row) => row.cambio < 0).length,
      sin_cambio: unchanged,
    },
  };
}

/** Markdown for the pull request body, so the delta is readable in review. */
export function formatDelta(delta: Delta, fecha: string): string {
  const { resumen } = delta;
  const lines = [
    `# Corrida ${fecha}`,
    "",
    `${resumen.ahora} municipalidades (antes ${resumen.antes}).`,
    `${resumen.altas} altas, ${resumen.bajas} bajas, ${resumen.subieron} subieron, ${resumen.bajaron} bajaron, ${resumen.sin_cambio} sin cambio.`,
    "",
  ];

  if (delta.movimientos.length > 0) {
    lines.push("## Mayores movimientos", "");
    lines.push("| Municipalidad | Antes | Ahora | Cambio | Sistemas nuevos |");
    lines.push("|---|---:|---:|---:|---|");
    for (const row of delta.movimientos.slice(0, 20)) {
      const sign = row.cambio > 0 ? "+" : "";
      lines.push(
        `| ${row.nombre} | ${row.antes} | ${row.ahora} | ${sign}${row.cambio} | ${row.sistemas_nuevos.join(", ") || "-"} |`
      );
    }
    lines.push("");
  }

  if (delta.altas.length > 0) {
    lines.push("## Altas", "");
    for (const row of delta.altas.slice(0, 30)) {
      lines.push(`- ${row.nombre} (${row.indice})`);
    }
    lines.push("");
  }

  if (delta.bajas.length > 0) {
    lines.push(
      "## Bajas",
      "",
      "Una baja puede ser una entidad que dejó de responder, no necesariamente una que dejó de existir.",
      ""
    );
    for (const row of delta.bajas.slice(0, 30)) {
      lines.push(`- ${row.nombre} (${row.indice})`);
    }
  }

  return lines.join("\n");
}
