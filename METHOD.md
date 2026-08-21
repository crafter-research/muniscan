# Method

muniscan measures the digital surface a Peruvian municipality **declares on its
own institutional page** at gob.pe. It is a measurement, not an audit: nobody is
surveyed, nothing is self-reported, and every number can be recomputed from the
published data.

## Discovery

gob.pe offers two views of its own directory, and they disagree.

- The branch tree at `/estado/{poder}` renders its entity links with
  JavaScript, so plain HTTP returns a shell. `/estado/gobiernos-locales` yields
  zero municipalities.
- The search backend at `busquedas.json?contenido[]=instituciones&sheet=N`
  returns 25 entities per sheet and does reach municipalities.

On the 2026-08-08 run the tree held 282 entities the search never returned, and
the search held 2,262 the tree never listed. **Neither view contains the other,**
so the census is their union.

The search backend does not order results deterministically: refetching one
sheet returns a different slice. A straight `1..ceil(total/25)` sweep therefore
returns duplicates and misses entities. muniscan oversamples instead, dedupes by
slug, and stops after 40 consecutive sheets add nothing new. That saturated at
sheet 185, yielding 3,520 of the 3,684 entities the backend declares (95.5%).

Later runs showed that saturation itself is not reproducible: two complete
GitHub Actions sweeps stopped growing after sheet 150 and found only 1,495 and
1,441 municipalities. Current discovery is therefore unioned with the
municipalities in the newest earlier published `index.json`. Every restored
municipality is fetched again. Current discovery can add entities, while a
known entity that now returns a non-2xx response remains an explicit error for
review rather than disappearing silently.

## Enrichment

One GET per entity. From the HTML we record:

- every outbound `*.gob.pe` host it links to
- whether it links to `/tramites-y-servicios`
- whether it links to `/normas-legales`
- whether the word "transparencia" appears

The outbound hosts turned out to be the useful signal: an entity publishes its
own subsystems on its page, so a single GET reveals the systems it runs without
guessing hostnames.

### Rate limit

gob.pe answers **HTTP 418** with an "Acceso restringido" page when it sees
concurrency, and the block covers the whole domain, not just the endpoint that
triggered it. Measured 2026-08-08: it clears after about fourteen minutes, and
one sequential worker pausing 0.7s ran 3,121 pages without tripping it.

`src/fetch.ts` is deliberately serial. Adding a worker pool is the one change
that breaks the pipeline.

## Scoring

Three axes, each a different question:

| Axis | Question | Weight |
|---|---|---:|
| Presence | Does it publish procedures and norms? | 0.20 |
| Adoption | Does it use the platforms the central state built? | 0.35 |
| Autonomy | Did it stand up systems of its own? | 0.45 |

Presence carries the least weight on purpose: it is a legal floor, not an
achievement. Autonomy carries the most because a system under your own domain is
the hardest signal to fake.

**A platform is central** when it appears in 100 or more entities across the
whole census. On the 2026-08-08 run that is six: `www.transparencia.gob.pe`,
`facilita.gob.pe`, `denuncias.servicios.gob.pe`, `reclamos.servicios.gob.pe`,
`transparencia.gob.pe`, `visitas.servicios.gob.pe`.

**A system is the entity's own** only when the domain contains the entity's own
slug. See below for why that rule decides the ranking.

Each axis is normalised against the highest value observed in the run, so the
scale reflects the actual population rather than a ceiling invented up front.
The index is the weighted sum, 0 to 100.

## The error that shipped first

The first version defined "own system" as any domain outside the six central
platforms. Under that rule the top municipality had **19 own systems**.

Seventeen of the nineteen belonged to other bodies: Contraloría (`appdji`,
`apps1`, `appscgr`, `buscadorinformes`), MEF (`apps2`, `apps4`, `apps5`), PCM
(`macexpress2`), Mininter (`conasec`). They were central-government systems that
simply fell below the 100-entity threshold. Only two were actually its own.

The index was rewarding **outbound links to other people's software**, which is
the opposite of what it claims to measure. Requiring the domain to contain the
entity's slug moved that municipality from 19 own systems to 5, from rank 1 to
rank 9, and put municipalities with verifiably own systems at the top.

It is worth recording because it is how an index usually fails: it measures
something correlated with what you wanted, and the ranking still looks
reasonable. The only reason it surfaced was opening the top entry and reading
all nineteen domains one by one.

The regression test for it lives in `src/score.test.ts` as *"own systems outrank
linking out, which was the bug that shipped first"*.

## Completeness

A run is checked before it is scored. `score` refuses a census that shrank more
than 5% against the newest earlier published index, one where more than 5% of
entities failed to answer, or an empty one. Failed run directories without an
`index.json` are not baselines.

This exists because the first scheduled run measured 1,495 municipalities
against the previous 1,794 and produced a diff claiming 386 closures in a single
day. gob.pe had throttled the crawler. Since each axis is normalised against the
best value in its own run, the short census also moved every surviving score, so
the corruption was not confined to the missing rows.

A partial run is not wrong data; it is absent data wearing the shape of data.
The pipeline is resumable, so the right response is to rerun `scan` for the same
date and let it continue. `--force` exists for a drop confirmed to be real.

## Runs

Each run writes `data/YYYY-MM-DD/` and never touches an earlier one. Runs are
immutable so a published DOI keeps pointing at the numbers measured that day.

```
data/YYYY-MM-DD/
  entities.json    the census, including discovered and restored municipality counts
  enriched.jsonl   one row per entity, appended as fetched
  index.json       the scored municipalities
  diff.json        what changed since the previous run
  DELTA.md         the same diff, readable in a pull request
```

`enriched.jsonl` is appended one row at a time. An earlier version held
everything in memory and wrote once at the end; killing it after gob.pe blocked
us threw away 1,600 already-fetched rows. Appending per row also makes a run
resumable, so rerunning `scan` picks up where it stopped.

## Related work

muniscan measures something none of these do, which is why it is not directly
comparable to any of them.

**MDOI Chile** (Busco et al., PeerJ CS 11:e3049, `10.7717/peerj-cs.3049`,
CC-BY) scored all 344 Chilean municipalities across 163 dichotomous items in
seven dimensions, coded **by hand** in 2022, weighted by explained variance from
an exploratory factor analysis. It measures **content and services**: is there an
org chart, a live chat, a published budget, a privacy policy.

It has **no item equivalent to "does this run under its own domain or inside the
central platform"**. muniscan's autonomy axis, the heaviest of the three, has no
counterpart there. The two indices are complementary, not comparable, and MDOI's
weights are data-driven from Chilean 2022 data so they are not reusable
elsewhere without rerunning the factor analysis.

MDOI is also a single snapshot: its authors describe it as "a baseline rather
than a current assessment", and no second wave has been published.

**DIGILOG** (ZHAW Zürich, Potsdam, WU Vienna) crawls municipal websites across
the 47 Council of Europe states with automated pipelines and machine learning.
It establishes that this kind of measurement can be automated. It does not cover
Latin America.

**UN LOSI** evaluates one city per country, scored manually by human assessors;
the UN's own methodology notes it is hard to automate.

**Coria et al. 2020** (arXiv 2006.14746) proposed exactly this for 2,457 Mexican
municipalities. Its abstract states that implementing the repository "is not
within the scope of this research". It was never built.

As far as we found, no automated, census-wide municipal index exists for any
Latin American country.
