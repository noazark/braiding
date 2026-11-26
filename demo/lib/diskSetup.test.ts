import { describe as group, expect, it } from 'vitest';
import { presets } from 'kumihimo';
import { describe, fromLink, fromPreset, paletteColor, resizeSetup, runOf, scaleSetup, scalesTo, snapSlots, toLink, type DiskSetup } from './diskSetup';
import { PALETTE } from './palette';
import { PRESET_COLORS } from './presetColors';

const setup: DiskSetup = {
  slots: 8,
  threads: [
    { slot: 5, color: PALETTE[0] },
    { slot: 0, color: '#3d7dd8' },
    { slot: 3, color: PALETTE[2] },
  ],
  pattern: '1>4 E+3>E R-2 3*4',
};

group('links', () => {
  it('round-trips a setup exactly, thread order and custom colors included', () => {
    expect(fromLink(toLink(setup))).toEqual(setup);
    expect(fromLink('#' + toLink(setup))).toEqual(setup);
  });

  it('writes palette colors as their index, others as hex', () => {
    expect(new URLSearchParams(toLink(setup)).get('colors')).toBe('0,3d7dd8,2');
  });

  it('keeps moves with spaces, signs and symbols intact', () => {
    expect(fromLink(toLink(setup))!.pattern).toBe('1>4 E+3>E R-2 3*4');
  });

  it('ignores links without a usable setup', () => {
    expect(fromLink('')).toBeNull();
    expect(fromLink('#slots=2&moves=1*2')).toBeNull();
    expect(fromLink('#slots=8')).toBeNull();
  });

  it('drops threads off the disk or doubled up, and falls back on bad colors', () => {
    expect(fromLink('#slots=4&threads=1,9,1,2&colors=zz,0,0,99&moves=1*2')!.threads).toEqual([
      { slot: 0, color: PALETTE[0] },
      { slot: 1, color: PALETTE[0] },
    ]);
  });
});

group('presets', () => {
  it('become setups in their default colors', () => {
    const maru = presets.find(p => p.id === 'maru-yotsu-round-4-threads')!;
    expect(fromPreset(maru)).toEqual({
      slots: 4,
      threads: [
        { slot: 0, color: paletteColor(0) },
        { slot: 1, color: paletteColor(5) },
        { slot: 2, color: paletteColor(0) },
        { slot: 3, color: paletteColor(5) },
      ],
      pattern: '2*1 4*3 R1 1*2 3*4 R1',
    });
  });

  it('every preset has a coloring, one color per thread', () => {
    for (const p of presets) expect(PRESET_COLORS[p.id]?.length, p.name).toBe(p.threads.length);
  });

  it('every preset survives a trip through a link', () => {
    for (const p of presets) {
      const s = fromPreset(p);
      expect(fromLink(toLink(s)), p.name).toEqual(s);
    }
  });
});

group('describe', () => {
  it('writes the setup out with 1-based slots', () => {
    expect(describe(setup)).toBe('Slots: 8\nThreads in slots: 6, 1, 4\nMoves: 1>4 E+3>E R-2 3*4');
  });
});

group('runs', () => {
  it('are made once per setup and shared', () => {
    const s = fromPreset(presets[0]!);
    expect(runOf(s)).toBe(runOf(s));
    expect(runOf(s).error).toBeNull();
    expect(runOf(s).timeline.at(3)!.move).not.toBeNull();
  });

  it('play the threads in the setup order', () => {
    const s: DiskSetup = {
      slots: 8,
      threads: [
        { slot: 4, color: '#000' },
        { slot: 0, color: '#fff' },
      ],
      pattern: '1>3',
    };
    expect(runOf(s).timeline.at(1)!.move!.thread).toBe(1);
  });

  it('have no moves, and say why, when the pattern is unreadable', () => {
    const run = runOf({ ...setup, pattern: '1>4 banana' });
    expect(run.error?.code).toBe('unreadable');
    expect(run.pattern).toEqual([]);
    expect(run.timeline.at(1)).toBeUndefined();
  });
});

group('resizing', () => {
  const preset = (id: string) => fromPreset(presets.find(p => p.id === id)!);

  it('spreads threads out and renumbers the moves when the disk grows', () => {
    const big = resizeSetup(preset('maru-yotsu-round-4-threads'), 8)!;
    expect(big.threads.map(t => t.slot)).toEqual([0, 2, 4, 6]);
    expect(big.pattern).toBe('3*1 7*5 R2 1*3 5*7 R2');
  });

  it('draws threads back in when every one lands on a slot', () => {
    const s = preset('basket-weave-8-threads');
    expect(resizeSetup(resizeSetup(s, 32)!, 8)).toEqual({ ...s, pattern: '1*2 3*4 5*6 7*8 3*2 5*4 7*6 1*8' });
  });

  it('keeps colors with their threads', () => {
    const s = preset('basket-weave-6-threads');
    expect(resizeSetup(s, 12)!.threads.map(t => t.color)).toEqual(s.threads.map(t => t.color));
  });

  it("refuses when it can't stay the same braid", () => {
    // Kongō Gumi's threads sit on odd slots: they'd land between slots on 16
    expect(resizeSetup(preset('kongo-gumi-spiral-8-threads'), 16)).toBeNull();
    // R1 on 4 slots would be a turn of 1.5 on 6
    expect(resizeSetup(preset('maru-yotsu-round-4-threads'), 6)).toBeNull();
  });
});

group('scaling to any size', () => {
  it('scales exactly when it can', () => {
    const s = fromPreset(presets.find(p => p.id === 'maru-yotsu-round-4-threads')!);
    expect(scaleSetup(s, 8)).toEqual(resizeSetup(s, 8));
  });

  it('otherwise moves everything to the nearest slots, so the moves still fit', () => {
    for (const p of presets)
      for (const n of [p.threads.length, 13, 29, 40]) {
        if (n < p.threads.length) continue;
        const s = scaleSetup(fromPreset(p), n);
        const label = `${p.name} on ${n}`;
        expect(s.slots, label).toBe(n);
        expect(new Set(s.threads.map(t => t.slot)).size, label).toBe(p.threads.length);
        expect(s.threads.every(t => t.slot >= 0 && t.slot < n), label).toBe(true);
        expect(runOf(s).error, label).toBeNull();
      }
  });

  it('keeps threads in the same order round the disk', () => {
    const s = scaleSetup(fromPreset(presets.find(p => p.id === 'kongo-gumi-16-threads')!), 17);
    const slots = s.threads.map(t => t.slot);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
  });
});

group('choosing a size', () => {
  const kongo = fromPreset(presets.find(p => p.id === 'kongo-gumi-spiral-8-threads')!);

  it('knows which sizes a braid survives', () => {
    expect(scalesTo(kongo, 28)).toBe(true);
    expect(scalesTo(kongo, 29)).toBe(false);
  });

  it('skips sizes the braid would break on, in the direction asked', () => {
    expect(snapSlots(kongo, 32, 31, 8, 64)).toBe(28);
    expect(snapSlots(kongo, 32, 29, 8, 64)).toBe(28);
    expect(snapSlots(kongo, 32, 33, 8, 64)).toBe(36);
    expect(snapSlots(kongo, 32, 28, 8, 64)).toBe(28);
  });

  it('stays within the limits', () => {
    expect(snapSlots(kongo, 32, 100, 8, 64)).toBeLessThanOrEqual(64);
    expect(snapSlots(kongo, 32, 2, 8, 64)).toBeGreaterThanOrEqual(8);
  });
});
