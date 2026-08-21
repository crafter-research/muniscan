import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { previousMunicipalities, previousMunicipalityCount } from "./history";

const root = join(tmpdir(), `muniscan-history-${process.pid}`);

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeIndex(date: string, slugs: string[]): void {
  const dir = join(root, date);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "index.json"),
    JSON.stringify({
      municipalidades: slugs.map((slug) => ({
        slug,
        nombre: `Municipalidad ${slug}`,
        poder: null,
        fuente: "search",
      })),
    })
  );
}

describe("published census history", () => {
  test("uses the newest earlier directory that has an index", () => {
    writeIndex("2026-08-08", ["muni-a", "muni-b"]);
    mkdirSync(join(root, "2026-08-09"), { recursive: true });

    expect(previousMunicipalities(root, "2026-08-21").map((row) => row.slug)).toEqual([
      "muni-a",
      "muni-b",
    ]);
    expect(previousMunicipalityCount(root, "2026-08-21")).toBe(2);
  });

  test("does not read a current or future index", () => {
    writeIndex("2026-08-21", ["muni-current"]);
    writeIndex("2026-09-01", ["muni-future"]);

    expect(previousMunicipalities(root, "2026-08-21")).toEqual([]);
    expect(previousMunicipalityCount(root, "2026-08-21")).toBeNull();
  });
});
