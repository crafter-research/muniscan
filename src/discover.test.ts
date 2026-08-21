import { describe, expect, test } from "bun:test";
import { restoreKnownMunicipalities, type Entity } from "./discover";

const entity = (slug: string, nombre: string): Entity => ({
  slug,
  nombre,
  poder: null,
  fuente: "search",
});

describe("restoreKnownMunicipalities", () => {
  test("restores municipalities omitted by nondeterministic discovery", () => {
    const discovered = [entity("muni-a", "Municipalidad A"), entity("minsa", "MINSA")];
    const previous = [entity("muni-a", "Municipalidad A"), entity("muni-b", "Municipalidad B")];

    const result = restoreKnownMunicipalities(discovered, previous);

    expect(result.restored).toBe(1);
    expect(result.entities.map((row) => row.slug)).toEqual(["minsa", "muni-a", "muni-b"]);
  });

  test("does not restore non-municipal entities", () => {
    const result = restoreKnownMunicipalities(
      [entity("muni-a", "Municipalidad A")],
      [entity("minsa", "MINSA")]
    );

    expect(result.restored).toBe(0);
    expect(result.entities.map((row) => row.slug)).toEqual(["muni-a"]);
  });

  test("keeps the current discovery record when a slug already exists", () => {
    const current = entity("muni-a", "Municipalidad A actualizada");
    const result = restoreKnownMunicipalities(
      [current],
      [entity("muni-a", "Municipalidad A anterior")]
    );

    expect(result.restored).toBe(0);
    expect(result.entities).toEqual([current]);
  });
});
