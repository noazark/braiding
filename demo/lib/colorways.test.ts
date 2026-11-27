import { describe, expect, it } from 'vitest';
import { seeded } from 'kumihimo';
import { COLORWAYS, colorway, type Colorway } from './colorways';
import { PALETTE } from './palette';

const kinds = Object.keys(COLORWAYS) as Colorway[];
const distinct = (cs: readonly string[]) => new Set(cs).size;

describe('colorways', () => {
  it('gives each thread a palette color, for every kind and size', () => {
    for (const kind of kinds)
      for (const n of [1, 2, 3, 7, 8, 16]) {
        const { colors } = colorway(n, seeded(n), kind);
        expect(colors, `${kind}, ${n}`).toHaveLength(n);
        for (const c of colors) expect(PALETTE as readonly string[]).toContain(c);
      }
  });

  it('colors each kind the way it says', () => {
    const r = seeded(3);
    expect(distinct(colorway(8, r, 'solid').colors)).toBe(1);
    const single = colorway(8, r, 'single').colors;
    expect(distinct(single)).toBe(2);
    expect(single.filter(c => c !== single.find(x => single.filter(y => y === x).length > 1)).length).toBe(1);
    const alt = colorway(8, r, 'alternate').colors;
    expect(alt.every((c, i) => c === alt[i % 2])).toBe(true);
    const pairs = colorway(8, r, 'pairs').colors;
    expect([0, 2, 4, 6].every(i => pairs[i] === pairs[i + 1])).toBe(true);
    const blocks = colorway(8, r, 'blocks').colors;
    // runs of one color: it changes color at most 3 times round the disk
    expect(blocks.filter((c, i) => i && c !== blocks[i - 1]).length).toBeLessThanOrEqual(3);
  });

  it('comes up with every kind', () => {
    const r = seeded(1);
    const seen = new Set(Array.from({ length: 200 }, () => colorway(8, r).kind));
    expect([...seen].sort()).toEqual([...kinds].sort());
  });
});
