<div align="center">

<img src="https://avatars.githubusercontent.com/u/215594622?s=120" width="72" alt="Crafter Research" />

# muniscan

**An automated, census-wide index of the digital surface Peru's municipalities declare on gob.pe.**

[![monthly scan](https://github.com/crafter-research/muniscan/actions/workflows/monthly-scan.yml/badge.svg)](https://github.com/crafter-research/muniscan/actions/workflows/monthly-scan.yml)
[![municipalities](https://img.shields.io/badge/municipalities-1%2C794-1f6feb)](./data)
[![coverage](https://img.shields.io/badge/census%20coverage-95.5%25-1f6feb)](./METHOD.md)
[![code MIT](https://img.shields.io/badge/code-MIT-000)](./LICENSE)
[![data CC--BY--4.0](https://img.shields.io/badge/data-CC--BY--4.0-000)](./DATA-LICENSE.md)

[Method](./METHOD.md) · [Limitations](./LIMITATIONS.md) · [Data licence](./DATA-LICENSE.md)

</div>

---

Existing digital-government indices are national and self-reported: a country
grades itself every two years. The one municipal index the UN publishes (LOSI)
scores a single city per country, by hand. Peru's own digital-government office
publishes aggregates ("94% have a digital mailroom") without breaking them down
by entity, and measures declared compliance rather than observed surface.

Nobody has measured all 1,794 municipalities automatically, repeatedly, and in a
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

Code MIT. Data CC-BY 4.0.

The legal basis is written up in [DATA-LICENSE.md](./DATA-LICENSE.md), including
what we could not confirm: gob.pe declares no content licence anywhere, and no
Peruvian precedent exists on republishing scraped state data.

Built by [Crafter Research](https://github.com/crafter-research).
