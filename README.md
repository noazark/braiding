# Braiding

This is a little exploration I took into braiding disks and pattern notation. My
daughter nerd sniped me with this one.

- [The Engine](packages/kumihimo) - A naive braiding engine defining notation,
  simulation, pattern checks, classification. Pure TypeScript, no dependencies.
  It's what the demo runs on.
- [The demo](demo) - Simple demo site showing off the engine and providing a
  playground for visitors to explore patterns.

## Getting started

You'll need Node 20 or later.

```bash
npm ci
npm run dev
```

| Script | Description |
| --- | --- |
| `npm run dev` | Run the site locally at http://localhost:5173 |
| `npm test` | Run the test suite |
| `npm run typecheck` | Typecheck the whole repo |
| `npm run build` | Builds the engine to `packages/kumihimo/dist` and the demo site to `demo/dist` |
| `npm run preview` | Serves the built site |
| `npm run check` | Typecheck, test and build. A convenience for CI runs |


## Ideas explored

- [**Kumihimo**](https://en.wikipedia.org/wiki/Kumihimo), the Japanese braiding
  craft.
- [**Braid groups**](https://en.wikipedia.org/wiki/Braid_group). A braid as a
  word of crossings between neighboring strands, rewritten by the braid
  relations. Because a disk is a ring, these are annular (affine) braids: the
  last strand neighbors the first.
- [**Trace monoids**](https://en.wikipedia.org/wiki/Trace_monoid). Crossings of
  different threads can happen in either order; a normal form puts them in a
  fixed order before two braids are compared.
