import { describe, expect, test } from "bun:test";
import { type HealthTarget, observeSample, observeTarget, selectHealthSample } from "./sample";
import type { Scored } from "./score";

function row(index: number): Scored {
  return {
    slug: `muni-${String(index).padStart(3, "0")}`,
    nombre: `Municipality ${index}`,
    poder: null,
    fuente: "search",
    http: 200,
    dominios: [`b.${index}.gob.pe`, `a.${index}.gob.pe`],
    tramites: true,
    normas: true,
    transparencia: true,
    presencia: 2,
    adopcion: 1,
    autonomia: 2,
    sistemas_propios: [`b.${index}.gob.pe`, `a.${index}.gob.pe`],
    sistemas_externos: 0,
    plataformas_centrales: [],
    indice: 100 - index / 10,
    ranking: index,
  };
}

function target(url: string): HealthTarget {
  return {
    sample_id: 1,
    quintil: 1,
    slug: "muni-test",
    nombre: "Municipality test",
    ranking: 1,
    indice: 100,
    dominio: new URL(url).host,
    url,
  };
}

describe("health sample", () => {
  test("selects exactly twenty municipalities from each ranking quintile", () => {
    const sample = selectHealthSample(Array.from({ length: 200 }, (_, index) => row(index + 1)));

    expect(sample).toHaveLength(100);
    for (let quintile = 1; quintile <= 5; quintile++) {
      expect(sample.filter((target) => target.quintil === quintile)).toHaveLength(20);
    }
    expect(new Set(sample.map((target) => target.slug)).size).toBe(100);
  });

  test("spreads each quintile across both ends of its ranking band", () => {
    const sample = selectHealthSample(Array.from({ length: 200 }, (_, index) => row(index + 1)));

    for (let quintile = 1; quintile <= 5; quintile++) {
      const ranks = sample
        .filter((target) => target.quintil === quintile)
        .map((target) => target.ranking);
      const bandStart = (quintile - 1) * 40 + 1;
      const bandEnd = quintile * 40;

      expect(ranks[0]).toBe(bandStart);
      expect(ranks.at(-1)).toBe(bandEnd);
      expect(
        ranks.slice(1).every((rank, index) => {
          const previous = ranks[index];
          return (
            rank !== null &&
            previous !== undefined &&
            previous !== null &&
            rank - previous >= 2 &&
            rank - previous <= 3
          );
        }),
      ).toBe(true);
    }
  });

  test("is deterministic regardless of input order and picks one stable domain", () => {
    const rows = Array.from({ length: 150 }, (_, index) => row(index + 1));
    const forward = selectHealthSample(rows);
    const reverse = selectHealthSample([...rows].reverse());

    expect(reverse).toEqual(forward);
    expect(forward.every((target) => target.dominio.startsWith("a."))).toBe(true);
    expect(forward.map((target) => target.sample_id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
  });

  test("rejects a snapshot with fewer than one hundred eligible municipalities", () => {
    expect(() =>
      selectHealthSample(Array.from({ length: 99 }, (_, index) => row(index + 1))),
    ).toThrow("need 100 municipalities with classified municipal systems, found 99");
  });

  test("rejects a sample size that cannot balance five quintiles", () => {
    expect(() =>
      selectHealthSample(
        Array.from({ length: 100 }, (_, index) => row(index + 1)),
        99,
      ),
    ).toThrow("sample size must be divisible by 5");
  });

  test("records an HTTP response and its final URL without retaining the body", async () => {
    const server = Bun.serve({
      port: 0,
      routes: {
        "/start": Response.redirect("/final", 302),
        "/final": new Response("body that must not be retained", {
          status: 204,
        }),
      },
    });

    try {
      const observation = await observeTarget(target(`${server.url}start`));

      expect(observation.reachable).toBe(true);
      expect(observation.http_status).toBe(204);
      expect(observation.final_url).toBe(`${server.url}final`);
      expect(observation.error).toBeNull();
      expect("body" in observation).toBe(false);
    } finally {
      server.stop(true);
    }
  });

  test("records a connection failure as an observation instead of aborting the sample", async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response() });
    const url = `${server.url}closed`;
    server.stop(true);

    const observation = await observeTarget(target(url));

    expect(observation.reachable).toBe(false);
    expect(observation.http_status).toBeNull();
    expect(observation.final_url).toBeNull();
    expect(observation.error).toBeString();
  });

  test("observes targets sequentially and reports progress", async () => {
    let active = 0;
    let maximumActive = 0;
    const server = Bun.serve({
      port: 0,
      async fetch() {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Bun.sleep(5);
        active -= 1;
        return new Response(null, { status: 200 });
      },
    });
    const progress: Array<[number, number]> = [];

    try {
      const targets = [1, 2, 3].map((id) => ({
        ...target(`${server.url}${id}`),
        sample_id: id,
      }));
      const observations = await observeSample(targets, (done, total) => {
        progress.push([done, total]);
      });

      expect(observations).toHaveLength(3);
      expect(maximumActive).toBe(1);
      expect(progress).toEqual([
        [1, 3],
        [2, 3],
        [3, 3],
      ]);
    } finally {
      server.stop(true);
    }
  });
});
