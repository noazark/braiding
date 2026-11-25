import { describe as group, expect, it } from 'vitest';
import { presets } from 'kumihimo';
import { describe, fromLink, fromPreset, paletteColor, runOf, toLink, type DiskSetup } from './diskSetup';
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
