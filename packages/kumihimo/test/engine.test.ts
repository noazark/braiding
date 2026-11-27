import { describe, expect, it } from 'vitest';
import {
  Timeline,
  braid,
  checkPattern,
  commutes,
  formatPattern,
  hasErrors,
  normalForm,
  parsePattern,
  presets,
  profileBraid,
  reduceWord,
  renumberPattern,
  simplifyWord,
  wordRoot,
  wordToNotation,
  type Crossing,
  type FindingCode,
  type Setup,
  type Word,
} from '../src/index.js';

const setup = (slots: number, threads: readonly number[], text: string): Setup => {
  const r = parsePattern(text, slots);
  if (!r.ok) throw new Error(r.error.message);
  return { slots, threads, pattern: r.pattern };
};
const codes = (s: Setup): FindingCode[] => checkPattern(s).map(f => f.code);
const w = (...xs: [number, 1 | -1][]): Word => xs.map(([gap, sign]) => ({ gap, sign }));

describe('notation', () => {
  it('reads moves, swaps, turns and gap moves', () => {
    const r = parsePattern('1>15, 3*4; R-8 E+3>E', 32);
    expect(r.ok && r.pattern).toEqual([
      { kind: 'move', from: { kind: 'slot', index: 0 }, to: { kind: 'slot', index: 14 }, text: '1>15' },
      { kind: 'swap', from: { kind: 'slot', index: 2 }, to: { kind: 'slot', index: 3 }, text: '3*4' },
      { kind: 'turn', by: -8, text: 'R-8' },
      { kind: 'move', from: { kind: 'gap', offset: 3 }, to: { kind: 'gap', offset: 0 }, text: 'E+3>E' },
    ]);
  });

  it('round-trips through formatPattern', () => {
    for (const p of presets) {
      const r = parsePattern(p.pattern, p.slots);
      expect(r.ok).toBe(true);
      if (r.ok) expect(parsePattern(formatPattern(r.pattern), p.slots)).toEqual({ ok: true, pattern: r.pattern.map(t => ({ ...t, text: expect.any(String) })) });
    }
  });

  it('explains what it cannot read, without throwing', () => {
    expect(parsePattern('1>2 banana', 8)).toMatchObject({ ok: false, error: { code: 'unreadable', token: 'banana' } });
    expect(parsePattern('1>9', 8)).toMatchObject({ ok: false, error: { code: 'slot-out-of-range', slot: 9, slots: 8 } });
    expect(parsePattern('R3', 8)).toMatchObject({ ok: false, error: { code: 'no-moves' } });
    expect(parsePattern('', 8)).toMatchObject({ ok: false, error: { code: 'no-moves' } });
  });

  it('renumbers fixed slots but leaves gap moves and turns alone', () => {
    const r = parsePattern('1>5 E+2>E R3', 8);
    if (!r.ok) throw new Error();
    expect(formatPattern(renumberPattern(r.pattern, 2, 8))).toBe('7>3 E+2>E R3');
  });
});

describe('the disk', () => {
  it('starts with the loaded disk, then one step per move', () => {
    // Kongō Gumi: threads in pairs at slots 32+1, 8+9, 16+17, 24+25
    const steps = [...take(braid(setup(32, [31, 0, 7, 8, 15, 16, 23, 24], '1>15 17>31 R-8 1>15 17>31 R-9')), 3)];
    expect(steps.map(s => s.index)).toEqual([0, 1, 2]);
    expect(steps[0]!.move).toBeNull();
    // "1>15" lifts thread 1 (in slot 1) over the pair in slots 8 and 9, into empty slot 15
    expect(steps[1]!.move).toMatchObject({ thread: 1, from: 0, to: 14, passed: [2, 3], shift: 2, stacked: false });
    expect(steps[1]!.positions[1]).toBe(14);
  });

  it('is pure: the same setup always plays the same steps', () => {
    const s = setup(32, [31, 0, 7, 8, 15, 16, 23, 24], '1>15 17>31 R-8 1>15 17>31 R-9');
    expect(new Timeline(s).extend(200).steps).toEqual(new Timeline(s).extend(200).steps);
  });

  it('halts, with a reason, when a move lifts from an empty slot', () => {
    const tl = new Timeline(setup(8, [0], '3>5')).extend(10);
    expect(tl.halt).toEqual({ reason: 'empty-slot', step: 1, slot: 2 });
    expect(tl.steps).toHaveLength(1);
  });

  it('turns shift every later slot number', () => {
    // move 1>3, turn by 2, so the next "1>3" is really slot 3 → 5
    const tl = new Timeline(setup(8, [0], '1>3 R2')).extend(2);
    expect(tl.steps.slice(1).map(s => [s.move!.from, s.move!.to])).toEqual([[0, 2], [2, 4]]);
  });

  it('counts E from the slot emptied last', () => {
    const tl = new Timeline(setup(8, [0, 1, 2, 3, 4, 5, 6], 'E+3>E')).extend(2);
    // the gap starts at slot 8 (index 7); E+3 is index 2
    expect(tl.steps.slice(1).map(s => [s.move!.from, s.move!.to])).toEqual([[2, 7], [5, 2]]);
  });

  it('counts threads from E, skipping other empty slots', () => {
    // threads in every other slot, so the gap starts at slot 2 (index 1): E+2 is the second thread on, in slot 5
    const tl = new Timeline(setup(8, [0, 2, 4, 6], 'E+2>E')).extend(1);
    expect([tl.steps[1]!.move!.from, tl.steps[1]!.move!.to]).toEqual([4, 1]);
  });

  it('drops a thread into the gap past fewer threads, whatever the empty slots', () => {
    // gap at slot 1; E+5 is the thread in slot 6. Back the short way (5 slots) passes four threads;
    // on round the long way (11 slots) passes only the one in slot 13, so that's the way it goes
    const tl = new Timeline(setup(16, [1, 2, 3, 4, 5, 12], 'E+5>E')).extend(1);
    const m = tl.steps[1]!.move!;
    expect([m.from, m.to, m.passed]).toEqual([5, 0, [5]]);
  });

  it('plays a gap braid the same with spare empty slots', () => {
    // 7-strand over 2 on its own 8 slots, and spread round 16 with the gap at slot 1
    const tight = new Timeline(setup(8, [1, 2, 3, 4, 5, 6, 7], 'E+3>E')).extend(60);
    const loose = new Timeline(setup(16, [2, 4, 6, 8, 10, 12, 14], 'E+3>E')).extend(60);
    expect(loose.steps.map(s => s.columns)).toEqual(tight.steps.map(s => s.columns));
  });
});

describe('braid words', () => {
  it('knows which crossings commute', () => {
    expect(commutes({ gap: 0, sign: 1 }, { gap: 2, sign: 1 }, 6)).toBe(true);
    expect(commutes({ gap: 0, sign: 1 }, { gap: 1, sign: 1 }, 6)).toBe(false);
    // around the ring, gap 5 neighbors gap 0
    expect(commutes({ gap: 0, sign: 1 }, { gap: 5, sign: 1 }, 6)).toBe(false);
    expect(commutes({ gap: 0, sign: 1 }, { gap: 2, sign: 1 }, 3)).toBe(false);
  });

  it('cancels a crossing against its undo, through commuting crossings', () => {
    expect(reduceWord(w([0, 1], [2, 1], [0, -1]), 6)).toEqual(w([2, 1]));
    // blocked by a neighboring crossing
    expect(reduceWord(w([0, 1], [1, 1], [0, -1]), 6)).toEqual(w([0, 1], [1, 1], [0, -1]));
  });

  it('cancels across the loop when cyclic', () => {
    expect(reduceWord(w([0, -1], [1, 1], [0, 1]), 6)).toHaveLength(3);
    expect(reduceWord(w([0, -1], [1, 1], [0, 1]), 6, { cyclic: true })).toEqual(w([1, 1]));
  });

  it('simplifies with the braid relation and never makes a word longer or changes its permutation', () => {
    // σ0 σ1 σ0⁻¹ … contains a hidden cancellation once rewritten
    const word = w([0, 1], [1, 1], [0, 1], [1, -1], [0, -1], [1, -1]);
    const out = simplifyWord(word, 6);
    expect(out.length).toBeLessThanOrEqual(word.length);
    expect(permutation(out, 6)).toEqual(permutation(word, 6));
    // a b a b⁻¹ a⁻¹ b⁻¹ is the identity braid
    expect(out).toEqual([]);
  });

  it('puts commuting reorderings in one normal form', () => {
    expect(normalForm(w([3, 1], [0, 1]), 6)).toEqual(normalForm(w([0, 1], [3, 1]), 6));
    expect(normalForm(w([1, 1], [0, 1]), 6)).toEqual(w([1, 1], [0, 1]));
  });

  it('finds the shortest repeating unit', () => {
    expect(wordRoot(w([0, 1], [2, -1], [0, 1], [2, -1]), 6)).toEqual(w([0, 1], [2, -1]));
    // commuting crossings may be in a different order in each copy
    expect(wordRoot(w([0, 1], [2, -1], [2, -1], [0, 1]), 6)).toEqual(w([0, 1], [2, -1]));
  });

  it('writes a word as swaps anyone can play', () => {
    expect(wordToNotation(w([0, 1], [1, -1], [3, 1]), 4)).toBe('1*2 3*2 4*1');
  });
});

describe('pattern check', () => {
  it('passes every preset', () => {
    for (const p of presets) {
      const s = setup(p.slots, p.threads, p.pattern);
      expect(hasErrors(checkPattern(s)), p.name).toBe(false);
    }
  });

  it('finds separate cords', () => {
    // two pairs that only ever swap within themselves
    expect(codes(setup(4, [0, 1, 2, 3], '1*2 3*4 2*1 4*3'))).toContain('disconnected');
  });

  it('finds threads left out', () => {
    expect(codes(setup(6, [0, 1, 2, 3, 4], '1*2 2*3 3*1'))).toContain('loose');
  });

  it('finds a move undone by the next', () => {
    expect(codes(setup(8, [0, 4], '1>3 3>1'))).toContain('undo');
  });

  it('finds layers that never interlock', () => {
    // thread 1 always goes over, the others always under
    expect(codes(setup(4, [0, 1, 2], '1>3 3>2 2>1'))).toEqual(expect.arrayContaining(['no-weaving']));
  });

  it('finds gap moves on a full disk', () => {
    expect(codes(setup(4, [0, 1, 2, 3], 'E+1>E'))).toContain('gap-but-full');
  });

  it('stops at an empty slot', () => {
    expect(checkPattern(setup(8, [0], '3>5'))).toEqual([{ code: 'halted', level: 'error', halt: { reason: 'empty-slot', step: 1, slot: 2 }, step: 0 }]);
  });
});

describe('profiles', () => {
  it('names Maru Yotsu and finds it round', () => {
    const p = presets.find(p => p.id === 'maru-yotsu-round-4-threads')!;
    const r = profileBraid(setup(p.slots, p.threads, p.pattern));
    expect(r.ok && { name: r.profile.name, shape: r.profile.shape, length: r.profile.repeat.length }).toEqual({
      name: '4-strand diamond lattice cord',
      shape: 'round',
      length: 8,
    });
  });

  it('gives the same signature to a pattern started from another slot', () => {
    const a = profileBraid(setup(6, [0, 1, 2, 3, 4, 5], '1*2 3*4 5*6 3*2 5*4 1*6'));
    const b = profileBraid(setup(6, [0, 1, 2, 3, 4, 5], '3*4 5*6 1*2 5*4 1*6 3*2'));
    expect(a.ok && b.ok && a.profile.signature === b.profile.signature).toBe(true);
  });

  it('rejects patterns that come apart, with a reason', () => {
    expect(profileBraid(setup(4, [0, 1, 2, 3], '1*2 3*4 2*1 4*3'))).toEqual({ ok: false, reason: 'cancels-out' });
    expect(profileBraid(setup(4, [0, 1, 2, 3], '1*2 3*4'))).toEqual({ ok: false, reason: 'disconnected' });
    expect(profileBraid(setup(8, [0, 1], '1*2'))).toEqual({ ok: false, reason: 'too-few-threads' });
  });
});

function* take<T>(it: Iterator<T>, n: number) {
  for (let i = 0; i < n; i++) {
    const r = it.next();
    if (r.done) return;
    yield r.value;
  }
}

/** Where each column's strand ends up: a braid invariant, so rewriting must preserve it. */
function permutation(word: readonly Crossing[], strands: number): number[] {
  const p = [...Array(strands).keys()];
  for (const { gap } of word) {
    const b = (gap + 1) % strands;
    [p[gap], p[b]] = [p[b]!, p[gap]!];
  }
  return p;
}
