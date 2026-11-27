import { describe, expect, it } from 'vitest';
import { presets, profileNotation } from 'kumihimo';
import { fromPreset, type DiskSetup } from './diskSetup';
import { resizeSetup, scalesTo, snapSlots } from './diskSize';
import { onMyDisk, smallestDisk } from './myDisk';

const preset = (id: string) => fromPreset(presets.find(p => p.id === id)!);
const signature = (s: DiskSetup) =>
  profileNotation(
    s.slots,
    s.threads.map(t => t.slot),
    s.pattern,
  )?.signature;

describe('resizing', () => {
  it('puts Kongō Gumi on 16 slots with its moves landing beside the pairs', () => {
    const s = resizeSetup(preset('kongo-gumi-spiral-8-threads'), 16)!;
    expect(s.threads.map(t => t.slot + 1)).toEqual([1, 4, 5, 8, 9, 12, 13, 16]);
    expect(s.pattern).toBe('1>7 9>15 R-4 1>7 9>15 R-5');
  });

  it('keeps groups of threads together', () => {
    const s = resizeSetup(preset('kongo-gumi-12-threads'), 16)!;
    expect(s.threads.map(t => t.slot + 1)).toEqual([1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16]);
  });

  it('moves a gap braid with its gap on slot 1', () => {
    const s = resizeSetup(preset('10-strand-over-2'), 16)!;
    expect(s.threads.some(t => t.slot === 0)).toBe(false);
    expect(s.pattern).toBe('E+3>E');
  });

  it('makes the same braid, keeping each thread its color', () => {
    for (const p of presets)
      for (const n of [8, 16, 32]) {
        const base = fromPreset(p);
        const s = resizeSetup(base, n);
        if (!s) continue;
        expect(signature(s), `${p.name} on ${n}`).toBe(signature(base));
        expect(s.threads.map(t => t.color)).toEqual(base.threads.map(t => t.color));
      }
  });

  it('puts every preset on a 32-slot disk, and all but the 16-plus-thread ones on 16', () => {
    const misfits = presets.filter(p => !resizeSetup(fromPreset(p), 16)).map(p => p.id);
    expect(misfits).toEqual(['kongo-gumi-16-threads', 'square-braid-16-threads', 'basket-weave-24-threads']);
    for (const p of presets) expect(resizeSetup(fromPreset(p), 32), p.name).not.toBeNull();
  });

  it("refuses a size it can't braid on", () => {
    // 16 threads fill a 16-slot disk: nowhere to move one to
    expect(resizeSetup(preset('kongo-gumi-16-threads'), 16)).toBeNull();
    expect(resizeSetup(preset('basket-weave-24-threads'), 16)).toBeNull();
  });
});

describe('choosing a size', () => {
  const kongo = preset('kongo-gumi-spiral-8-threads');

  it('skips sizes the braid would break on, in the direction asked', () => {
    expect(scalesTo(kongo, 29)).toBe(false);
    const down = snapSlots(kongo, 32, 31, 8, 32);
    expect(down).toBeLessThan(31);
    expect(scalesTo(kongo, down)).toBe(true);
    expect(snapSlots(kongo, 16, 17, 8, 32)).toBeGreaterThan(16);
  });

  it('stays within the limits', () => {
    expect(snapSlots(kongo, 32, 100, 8, 32)).toBeLessThanOrEqual(32);
    expect(snapSlots(kongo, 32, 2, 8, 32)).toBeGreaterThanOrEqual(8);
  });
});

describe('your disk', () => {
  it('moves a braid onto a fixed disk, or says it does not fit', () => {
    expect(onMyDisk(preset('kongo-gumi-spiral-8-threads'), 16)).toMatchObject({ fits: true, setup: { slots: 16 } });
    expect(onMyDisk(preset('square-braid-16-threads'), 16)).toMatchObject({ fits: false, setup: { slots: 32 } });
  });

  it('leaves a braid at its own size on any disk', () => {
    const s = preset('10-strand-over-2');
    expect(onMyDisk(s, 'any')).toEqual({ setup: s, fits: true });
  });
});

describe('smallest disk', () => {
  it('is the smallest standard disk a braid goes on', () => {
    expect(smallestDisk(preset('maru-yotsu-round-4-threads'))).toBe(8);
    expect(smallestDisk(preset('kongo-gumi-spiral-8-threads'))).toBe(16);
    expect(smallestDisk(preset('square-braid-16-threads'))).toBe(32);
  });
});
