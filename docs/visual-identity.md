# Muniscan visual identity

## Core aesthetic

Muniscan is an operational civic atlas: part public-data instrument, part field
report. It uses dense evidence surfaces without looking like a generic admin
dashboard. Mineral paper keeps the page editorial; municipal blue anchors the
dataset; coral calls attention to observations without turning them into alerts.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#102A43` | Primary text, rules, deep data surfaces |
| Mineral paper | `#F2EFE6` | Page background |
| Light paper | `#FAF8F2` | Tables and contained evidence |
| Municipal blue | `#1D5F74` | Measured values and comparison surfaces |
| Census aqua | `#B9DCD7` | Citation and contextual surfaces |
| Signal coral | `#ED654D` | Large signal fields and graphical marks |
| Accessible coral text | `#A83729` | Small text on paper |
| Index yellow | `#EFC75E` | Table metadata and directional signal |

## Typography

- Display and body use the system sans stack to keep the artifact portable.
- Display sizes use `clamp()` and short line lengths rather than fixed boxes.
- Snapshot dates, ranks, filenames and labels use the system monospace stack.
- Titles are compact and editorial; paragraphs remain open and readable.

## Layout rules

- Sections grow from content. No fixed section heights.
- Repeated evidence uses tables, rows and rules instead of generic cards.
- Wide tables own their horizontal scroll and never widen the page.
- The main breakpoint moves two-column evidence into one column at 1000px.
- Mobile display type is capped at 13vw to prevent long Spanish words from
  imposing a wider grid track.

## Visual concept

The bar-shaped mark represents three uneven levels of municipal digital
surface. Squares, circles and diamonds form an abstract census field. One coral
shape among blue outlines signals a record worth inspecting, not a legal or
quality judgment.

## Avoid

- decorative borders unrelated to evidence hierarchy;
- fixed-height editorial blocks;
- rankings presented as compliance or service quality;
- dashboard chrome, gradients and interchangeable SaaS cards;
- coral text below accessible contrast thresholds.
