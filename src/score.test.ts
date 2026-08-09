import { describe, expect, test } from "bun:test";
import { centralPlatforms, score, CENTRAL_THRESHOLD } from "./score";
import { diff } from "./diff";
import type { Enriched } from "./enrich";

function entity(slug: string, dominios: string[], flags = {}): Enriched {
  return {
    slug,
    nombre: slug,
    poder: null,
    fuente: "search",
    http: 200,
    dominios,
    tramites: true,
    normas: true,
    ...flags,
  };
}

/** A domain shared by enough entities to clear the central threshold. */
function population(shared: string, count: number): Enriched[] {
  return Array.from({ length: count }, (_, index) => entity(`filler${index}`, [shared]));
}

describe("centralPlatforms", () => {
  test("a domain shared across the state is central", () => {
    const central = centralPlatforms(population("facilita.gob.pe", CENTRAL_THRESHOLD));
    expect(central.has("facilita.gob.pe")).toBe(true);
  });

  test("a domain just below the threshold is not", () => {
    const central = centralPlatforms(population("facilita.gob.pe", CENTRAL_THRESHOLD - 1));
    expect(central.has("facilita.gob.pe")).toBe(false);
  });
});

describe("score", () => {
  const central = new Set(["facilita.gob.pe"]);

  test("a system under the entity's own domain counts as autonomy", () => {
    const [row] = score([entity("munilince", ["pagos.munilince.gob.pe"])], central);
    expect(row?.autonomia).toBe(1);
    expect(row?.sistemas_propios).toEqual(["pagos.munilince.gob.pe"]);
  });

  test("linking to another body's portal does not", () => {
    const [row] = score([entity("munilince", ["apps1.contraloria.gob.pe"])], central);
    expect(row?.autonomia).toBe(0);
    expect(row?.sistemas_externos).toBe(1);
  });

  test("the slug matches its domain across hyphens", () => {
    const [row] = score([entity("muni-san-borja", ["www.munisanborja.gob.pe"])], central);
    expect(row?.autonomia).toBe(1);
  });

  test("adopting a central platform is adoption, not autonomy", () => {
    const [row] = score([entity("munilince", ["facilita.gob.pe"])], central);
    expect(row?.adopcion).toBe(1);
    expect(row?.autonomia).toBe(0);
  });

  test("an entity that publishes neither procedures nor norms scores zero presence", () => {
    const bare = entity("munix", [], { tramites: false, normas: false });
    const [row] = score([bare], central);
    expect(row?.presencia).toBe(0);
    expect(row?.indice).toBe(0);
  });

  test("own systems outrank linking out, which was the bug that shipped first", () => {
    const builder = entity("munia", ["portal.munia.gob.pe", "pagos.munia.gob.pe"]);
    const linker = entity("munib", [
      "apps1.contraloria.gob.pe",
      "apps2.mef.gob.pe",
      "macexpress2.pcm.gob.pe",
      "conasec.mininter.gob.pe",
    ]);
    const [first] = score([builder, linker], central);
    expect(first?.slug).toBe("munia");
  });

  test("ranking is dense and ordered", () => {
    const rows = score(
      [
        entity("muni1", ["a.muni1.gob.pe"]),
        entity("muni2", []),
        entity("muni3", ["a.muni3.gob.pe", "b.muni3.gob.pe"]),
      ],
      central
    );
    expect(rows.map((row) => row.ranking)).toEqual([1, 2, 3]);
    expect(rows[0]!.indice).toBeGreaterThanOrEqual(rows[1]!.indice);
  });
});

describe("diff", () => {
  const central = new Set<string>();
  const before = score([entity("munia", []), entity("munib", [])], central);
  const after = score(
    [entity("munia", ["portal.munia.gob.pe"]), entity("munic", [])],
    central
  );

  test("an entity present only in the new run is an alta", () => {
    expect(diff(before, after).altas.map((row) => row.slug)).toEqual(["munic"]);
  });

  test("an entity that stopped answering is a baja", () => {
    expect(diff(before, after).bajas.map((row) => row.slug)).toEqual(["munib"]);
  });

  test("a new own system shows up as movement with the domain named", () => {
    const movement = diff(before, after).movimientos.find((row) => row.slug === "munia");
    expect(movement?.cambio).toBeGreaterThan(0);
    expect(movement?.sistemas_nuevos).toEqual(["portal.munia.gob.pe"]);
  });

  test("comparing a run against itself reports no change", () => {
    const delta = diff(before, before);
    expect(delta.movimientos).toHaveLength(0);
    expect(delta.altas).toHaveLength(0);
    expect(delta.bajas).toHaveLength(0);
  });
});
