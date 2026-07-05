---
title: Detecting Next.js and Vite Dev HTML Without Breaking Production
subtitle: '`webpack-hmr` in the page means “do not inject.”'
date: 2026-07-22
description: One regex gate saves dev workflows while keeping client feedback on production builds and `next start` previews.
series: ShipLocal build series
series_order: 26
---

_See the full user guide: [How to get client feedback on tunnel previews](/blog/how-to-get-client-feedback-on-tunnel-previews)._

We skip feedback overlay injection when HTML contains dev bundler markers (`webpack-hmr`, `@vite/client`, `@react-refresh`, `__turbopack`). Production `next start` HTML does not include them, so clients still get the 💬 button on review-ready previews.

Implementation: `apps/server/src/tunnel/feedback-injection.ts` and tests in `feedback-injection.test.ts`. Opt-in dev overlay: `shiplocal 3000 --feedback`.
