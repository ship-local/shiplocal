## Problem

Developers must know which port their stack uses before running `shiplocal`. Common frameworks have conventional defaults that could be detected automatically.

## Proposal

Detect common frameworks and suggest available ports:

| Framework | Default port |
| --------- | ------------ |
| Next.js   | 3000         |
| Vite      | 5173         |
| Rails     | 3000         |
| Laravel   | 8000         |

Future: `shiplocal up` with no port argument.

## Layer

Core

## Labels

Good first issue candidate — discovery logic can start as a standalone module with tests.

Part of [ROADMAP v0.2+](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).
