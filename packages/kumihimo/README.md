# kumihimo

A dependency-free engine for **braiding disks**. Write a pattern, play it on a
virtual disk, and find out whether it makes a braid and what kind. Powers the
[Braiding simulator](../../README.md).

```sh
npm install kumihimo
```

## Usage

**1. Write a pattern.** Patterns use the slot numbers printed on the disk (`1 …
N`):

| Token   | Meaning |
| ------- | ------- |
| `1>15`  | Move the thread in slot 1 to slot 15. |
| `3*4`   | Swap the threads in slots 3 and 4. |
| `R-8`   | Turn the disk by 8 slots. |
| `E+3>E` | Move the third thread past the empty slot into it. |

```ts
import { parsePattern } from 'kumihimo';

const parsed = parsePattern('1>15 17>31 R-8 1>15 17>31 R-9', 32);
if (!parsed.ok) throw new Error(parsed.error.message);
```

**2. Set up the disk.** List the starting slot of each thread. These are
0-based, so slot 1 is `0`:

```ts
const setup = { slots: 32, threads: [31, 0, 7, 8, 15, 16, 23, 24], pattern: parsed.pattern };
```

**3. Check it.** You get a list of findings. Anything at level `error` or `warn`
means the pattern has a problem:

```ts
import { checkPattern } from 'kumihimo';

checkPattern(setup);
// [{ code: 'sound', level: 'ok' }, { code: 'repeats', level: 'ok', length: 16, ... }]
```

**4. Name it.**

```ts
import { profileBraid } from 'kumihimo';

const r = profileBraid(setup);
if (r.ok) r.profile.name; // "8-strand twill wave cord"
```

**5. Step through it**, for example to draw the disk:

```ts
import { Timeline } from 'kumihimo';

const tl = new Timeline(setup);
tl.at(10)?.positions; // the slot each thread is in after 10 moves (undefined if the pattern halted)
```

To skip writing a pattern yourself, start from one of the `presets` (Kongō Gumi,
Maru Yotsu, Edo Yatsu, and others).

## Development

```sh
npm test          # unit tests + behavior lock
npm run build     # dist/ with type declarations
```

`test/fixtures/original.json` locks the engine's behavior to the original
simulator. Regenerate it only when you mean to change that behavior.
