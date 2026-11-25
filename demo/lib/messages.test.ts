import { describe, expect, it } from 'vitest';
import { checkPattern, parsePattern } from 'kumihimo';
import { describeFindings } from './messages';
import fixture from './fixtures/check-text.json' with { type: 'json' };

describe('pattern-check wording matches the original simulator', () => {
  it(`${fixture.cases.length} patterns`, () => {
    for (const c of fixture.cases) {
      const parsed = parsePattern(c.pat, c.N);
      if (!parsed.ok) throw new Error(parsed.error.message);
      const threads = c.slots.map(s => s - 1);
      const lines = describeFindings(checkPattern({ slots: c.N, threads, pattern: parsed.pattern }), id => `slot ${threads[id]! + 1}`);
      expect(
        lines.map(l => [l.tone, l.text, l.step ?? null]),
        `${c.N} slots, ${c.pat}`,
      ).toEqual(c.lines);
    }
  });
});
