import { afterEach, describe, expect, test } from "bun:test";
import { get } from "./fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("get", () => {
  test("reports a non-2xx response as an error", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response("not found", { status: 404 }))) as unknown as typeof fetch;

    const result = await get("https://www.gob.pe/missing");

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "HTTP 404",
      blocked: false,
    });
  });
});
