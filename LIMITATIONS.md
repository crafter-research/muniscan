# Limitations

Read this before citing a number from muniscan, and especially before citing one
about a specific municipality.

## What the index does not measure

**Quality.** A municipality that declares `pagoenlinea.example.gob.pe` scores for
it whether that system works, is maintained, or is used by anyone. muniscan
counts declared surface, not delivered service.

**Use.** Nothing here says how many citizens completed a procedure online. A
municipality with seven systems nobody uses outranks one with a single system
everyone uses.

**Undeclared systems.** The measurement reads one page: the entity's page at
gob.pe. Software that exists but is not linked from there is invisible. A low
score means "declares little on gob.pe", never "has nothing".

**Systems under third-party domains.** Autonomy requires the domain to contain
the entity's own slug. A municipality whose portal lives on a commercial `.pe`,
under its regional government's domain, or on a hosted platform scores zero
autonomy despite having built something. This is the known false negative, and
it is a deliberate trade: the looser rule produced a ranking that rewarded
linking to other bodies' portals (see METHOD.md).

**Budget, population, territory.** No fiscal or demographic variable enters the
index. It cannot say whether a municipality does much with little. Crossing with
the MEF budget registry would answer that; it has not been done.

## What a score is not

A low score is **not** evidence of non-compliance with any law. The indicators
here are not the legal obligations of Peru's transparency framework, and nothing
in this dataset should be read as an accusation against an entity or its
officials.

If a single entity looks anomalous, treat that as a lead requiring manual
verification, not a finding. Concretely: in the 2026-08-08 census exactly one
entity of 3,520 lacked a transparency link. That is the kind of n=1 result that
is far more likely to be a measurement artifact, a redirect, or a dependency on
a parent ministry's portal than an actual breach. We did not publish it as one,
and neither should anyone using this data.

## Coverage

The 2026-08-08 run reached 3,520 of the 3,684 entities gob.pe declares (95.5%).
The missing 164 are entities that neither the branch tree nor the saturated
search sweep surfaced. They are not distributed randomly, and we do not know
which way they lean. Percentages here are over what was measured, not over the
full universe.

## Method stability

The central-platform threshold (100 entities) and the axis weights
(0.2 / 0.35 / 0.45) are **our choices**, not derived from theory or fitted to
data. Different choices produce a different ranking. They are recorded in
`src/score.ts` and versioned with the data so any run can be recomputed under
different assumptions.

If the weights change, every historical run should be rescored before comparing
across time. A diff between runs scored under different weights is meaningless.

## Source stability

gob.pe changes without notice. Entities are renamed, merged, or migrated; the
search backend could stop exposing sheets tomorrow. A drop in an entity's score
between runs may reflect a change at the source rather than a change at the
municipality. This is why every diff names the systems that appeared or
disappeared: so a reviewer can tell the two apart.

## Comparability

muniscan is not comparable to MDOI Chile, LOSI, EGDI, or DIGILOG. Those measure
content, services, or national policy; muniscan measures declared technical
architecture. Placing a muniscan score beside an MDOI score is an error. See the
related work section of METHOD.md.
