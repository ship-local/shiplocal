---
title: Detecting Next.js and Vite Dev HTML Without Breaking Production
subtitle: `webpack-hmr` in the page means “do not inject.”
date: 2026-07-22
description: One regex gate saves dev workflows while keeping client feedback on production builds and `next start` previews.
series: ShipLocal build series
series_order: 26
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Markers we match: `webpack-hmr`, `@vite/client`, `@react-refresh`, `__turbopack`, `react-refresh.js`
- Why production `next build` HTML still gets the overlay
- False positives/negatives and test cases in `feedback-injection.test.ts`
- Separating “dev collaboration” from “client feedback on staging previews”
- Relationship to CSP checks and dedupe markers
