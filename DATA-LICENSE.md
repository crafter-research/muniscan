# Data license

Code is MIT (see LICENSE). **The data in `data/` is CC-BY 4.0.**

## Why the data can be published

This is a summary of what we checked before publishing, not legal advice.

**The data are facts, and facts are not copyrightable in Peru.** Legislative
Decree 822 (Ley sobre el Derecho de Autor), article 9.d, excludes "los simples
hechos o datos" from copyright protection. What this dataset holds is exactly
that: an entity's name, its slug, the `*.gob.pe` hosts its page links to, and
three booleans. Article 5.l protects a database only for the originality of its
selection and arrangement, never for the data it contains. Andean Community
Decision 351, binding on Peru, says the same.

**Peru has no sui generis database right.** Unlike the EU's Directive 96/9/EC,
neither Peruvian nor Andean law grants protection for the effort of compiling
non-original data. Peru follows the originality model.

**The information is public by law.** Law 27806 (Transparency and Access to
Public Information), article 3, presumes all state-held information public
except the categories in article 15: secret, reserved, or confidential. Entity
names and institutional domains fall in none of them. Article 5 is what requires
entities to publish institutional information on their portals in the first
place.

**No personal data is involved.** Law 29733 defines personal data as information
about a *natural person*. A municipality is not one. This dataset contains no
names of officials, no contact details, no photographs.

**Crawling is permitted.** `https://www.gob.pe/robots.txt` disallows only
`/admin/` for all agents, and bans AhrefsBot by name. Nothing this pipeline
touches is disallowed. Requests are serial with a 0.7s pause.

## What we could not confirm

Stated plainly, because the honest gaps matter more than the reassuring parts.

- **gob.pe declares no content license.** `/terminos-y-condiciones`,
  `/politica-de-privacidad` and `/aviso-legal` all return 404, and the homepage
  names no license. Peru has no state-wide open licence comparable to the UK's
  OGL; under the open-data framework each entity picks a licence per dataset.
  The absence of a declared licence is not the same as a grant of permission.
- **No legal precedent exists.** We found no INDECOPI or judicial decision in
  Peru on republishing data scraped from state portals. Peruvian civic-tech
  projects do publish such scrapers openly without known incident, but that is
  tolerance in practice, not a ruling.
- **None of this has been reviewed by a Peruvian lawyer.** If that review
  contradicts what is written here, this file is wrong and the licence changes.

## Disclaimer

The data was obtained by automated collection from public pages of gob.pe, the
Peruvian State's single digital platform, on the date recorded in each run
directory.

gob.pe is the original source of the institutional information referenced here.
Publishing this dataset implies no affiliation with, endorsement by, or official
certification from the Peruvian State.

Values reflect what each page declared at the moment it was read and may not
describe any portal's current state. Nothing here should be read as an
assessment of legal compliance by any entity. See LIMITATIONS.md.
