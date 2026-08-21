# 100-site health sample

The health sample records one bounded HTTP observation for 100 domains that
Muniscan classifies as municipal systems from links published on gob.pe. It is
attached to a scored Muniscan snapshot and can be regenerated from that
snapshot.

## Selection

1. Start with municipalities whose scored record contains at least one
   `sistemas_propios` domain. This field is Muniscan's hostname-based
   classification, not a verified ownership claim.
2. Order them by the ranking already published in the snapshot.
3. Divide the eligible population into five equal ranking bands.
4. Select 20 evenly spaced municipalities from each band.
5. Choose one domain per municipality: the first domain in lexical order.

The result contains exactly 100 municipalities, 20 per ranking quintile. It is
deterministic for a given `index.json`.

## Observation

Muniscan sends one sequential `GET` to `https://<classified-domain>/` with
redirects enabled and a 15-second timeout. It records:

- observation time
- whether the request reached an HTTP response
- HTTP status
- final URL after redirects
- elapsed milliseconds
- a short error string when no HTTP response was obtained

It does not retain response bodies, execute browser interactions, submit forms,
use credentials, bypass access controls or retry aggressively.

## Interpretation

A row is a single observation, not an uptime measurement. `reachable: false`
can mean DNS, TLS, network, timeout or another transient error. An HTTP response
does not establish that a service works for a citizen. A 2xx response does not
establish quality, accessibility, security, legal compliance or use.

The sample is not representative of every municipal website. It covers one
domain classified as a municipal system for municipalities with at least one.
Municipalities without such a classification are outside this sampling frame.

Never convert this file into a municipal ranking or a service-quality score
without a separately reviewed method.
