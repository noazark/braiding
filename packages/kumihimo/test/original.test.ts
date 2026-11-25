/**
 * Behavior lock: the engine must reproduce the original single-file simulator and explorer exactly.
 *
 * `fixtures/original.json` was recorded by running the original pages' code (with `Math.random`
 * replaced by the same seeded generator this package uses) over every preset and a few thousand
 * random candidates. If a change here is intended, regenerate the fixture on purpose and say why.
 */
import { describe, expect, it } from 'vitest';
import {
  Timeline,
  checkPattern,
  generators,
  parsePattern,
  presets,
  profileBraid,
  refineCandidate,
  seeded,
  type BraidProfile,
  type Family,
  type Setup,
} from '../src/index.js';
import golden from './fixtures/original.json' with { type: 'json' };

type StepRow = [number[], number[], number, number, null | [number, number | null, number, number, number, number, number | null, number[], boolean]];

const setupOf = (p: (typeof presets)[number]): Setup => {
  const r = parsePattern(p.pattern, p.slots);
  if (!r.ok) throw new Error(r.error.message);
  return { slots: p.slots, threads: p.threads, pattern: r.pattern };
};

const summary = (p: BraidProfile) => ({
  period: p.repeat.length,
  turns: p.repeat.turns,
  round: p.shape === 'round',
  raw: p.crossings.played,
  kept: p.crossings.kept,
  name: p.name,
  seam: p.crossesSeam,
  simple: p.unitNotation,
  key: p.signature,
});

const levels = { ok: 'ok', info: 'info', warn: 'warn', error: 'err' } as const;

describe('presets match the original', () => {
  presets.forEach((preset, i) => {
    const g = golden.presets[i]!;
    it(preset.name, () => {
      expect(preset.name).toBe(g.name);
      const setup = setupOf(preset);

      const tl = new Timeline(setup).extend(79);
      (g.steps as StepRow[]).forEach(([pos, col, off, E, mv], s) => {
        const step = tl.steps[s]!;
        expect(step.positions).toEqual(pos);
        expect(step.columns).toEqual(col);
        expect(step.turn).toBe(off);
        expect(step.gap).toBe(E);
        if (!mv) return expect(step.move).toBeNull();
        const m = step.move!;
        expect([m.thread, m.partner ?? null, m.from, m.to, m.token, m.shift, m.partnerShift ?? null, m.passed, m.stacked]).toEqual(mv);
      });

      const findings = checkPattern(setup);
      expect(findings.map(f => levels[f.level])).toEqual(g.check.map(c => c[0]));
      expect(findings.map(f => ('step' in f ? f.step : null))).toEqual(g.check.map(c => c[2]));

      const r = profileBraid(setup, { random: seeded(7) });
      expect(r.ok).toBe(true);
      if (r.ok) expect(summary(r.profile)).toEqual(g.study);
    });
  });
});

describe('random exploration matches the original', () => {
  for (const run of golden.random) {
    it(`${run.fam} up to ${run.tmax} threads, seed ${run.seed}`, () => {
      const random = seeded(run.seed);
      const generate = generators[run.fam as Family];
      run.rows.forEach((row, i) => {
        const c = generate(run.tmax, random);
        if (row === 0) return expect(c, `candidate ${i}`).toBeNull();
        const [N, slots, pat, f] = row as [number, number[], string, Record<string, unknown> | null];
        expect(c, `candidate ${i}`).not.toBeNull();
        expect([c!.slots, c!.threads.map(s => s + 1), c!.pattern]).toEqual([N, slots, pat]);
        const find = refineCandidate(c!, { random });
        if (!f) return expect(find, `candidate ${i}: ${pat}`).toBeNull();
        expect(find, `candidate ${i}: ${pat}`).not.toBeNull();
        expect({
          ...summary(find!.profile),
          pat: find!.pattern,
          slots: find!.threads.map(s => s + 1),
          orig: find!.simplifiedFrom?.pattern ?? null,
          origRaw: find!.simplifiedFrom?.played ?? null,
          origCut: find!.simplifiedFrom?.canceled ?? null,
        }).toEqual(f);
      });
    });
  }
});
