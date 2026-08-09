# muniscan

An automated, census-wide index of the digital surface Peru's municipalities
declare on gob.pe.

Existing digital-government indices are national and self-reported: a country
grades itself every two years. The one municipal index the UN publishes (LOSI)
scores a single city per country, by hand. Peru's own digital-government office
publishes aggregates ("94% have a digital mailroom") without breaking them down
by entity, and measures declared compliance rather than observed surface.

Nobody has measured all 1,787 municipalities automatically, repeatedly, and in a
way anyone else can rerun. That is what this does.

## What it found

From the run of 2026-08-08, covering 3,520 of the 3,684 entities gob.pe declares:

- **79% of municipalities have built nothing of their own.** They live entirely
  inside gob.pe and the central platforms.
- **The central state builds platforms municipalities do not adopt.** Facilita,
  the digital mailroom, reached 66.6%. GeoPerú reached 1.8%, the DJI 1.4%,
  SERVIR 1.3%, MEF's consulta amigable 1.2%. One worked; four did not.
- **Digital surface does not follow the capital.** Nineteen of the top twenty
  municipalities are outside Lima.
- The median index is 34 out of 100.

## Use

```bash
bun install
bun run scan          # discover and enrich; resumable, safe to rerun
bun run score         # build the index from a scan
bun run diff <a> <b>  # compare two runs
bun test
```

A run writes `data/YYYY-MM-DD/` and never touches an earlier one.

**One request at a time.** gob.pe answers HTTP 418 and blocks the whole domain
when it sees concurrency; it clears after about fourteen minutes. The pipeline
is serial with a 0.7s pause on purpose. Do not add a worker pool.

## Read before citing

- [METHOD.md](./METHOD.md) — how discovery, enrichment and scoring work, and the
  scoring bug that shipped in the first version
- [LIMITATIONS.md](./LIMITATIONS.md) — what the index does not measure, and why a
  low score is not evidence of non-compliance

muniscan measures declared technical architecture. It is not comparable to MDOI
Chile, LOSI or EGDI, which measure content, services or national policy.

## Related work

- MDOI Chile — Busco et al., PeerJ CS 11:e3049, [10.7717/peerj-cs.3049](https://doi.org/10.7717/peerj-cs.3049)
- DIGILOG — automated municipal crawling across the Council of Europe
- UN LOSI — one city per country, scored manually
- Coria et al. 2020, [arXiv:2006.14746](https://arxiv.org/abs/2006.14746) — proposed this for Mexico, never built

## License

Code MIT. Data license pending: the terms under which gob.pe content may be
redistributed have not been verified yet, and no dataset is published until they
are.

Built by [Crafter Research](https://github.com/crafter-research).
