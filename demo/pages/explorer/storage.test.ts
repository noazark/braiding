import { describe, expect, it } from 'vitest';
import { parseFinds, serializeFinds, MAX_SAVED } from './storage';
import { colorsOf, keyOf, presetCards, withColors, type Card } from './model';

const sample = (): Card[] => presetCards().map(([, c]) => ({ ...c, known: null }));

describe('saving finds', () => {
  it('round-trips finds exactly, analysis and colors included', () => {
    const finds = sample().slice(0, 5);
    expect(parseFinds(serializeFinds(finds))).toEqual(JSON.parse(JSON.stringify(finds)));
  });

  it('keeps only the newest', () => {
    const one = sample()[0]!;
    const many = Array.from({ length: MAX_SAVED + 20 }, (_, i) => withColors(one, ['#' + String(i).padStart(6, '0')]));
    const back = parseFinds(serializeFinds(many));
    expect(back).toHaveLength(MAX_SAVED);
    expect(colorsOf(back[0]!)[0]).toBe('#000020');
  });

  it('always keeps liked finds, however old', () => {
    const all = sample();
    const one = all[0]!;
    const many = [all[1]!, ...Array.from({ length: MAX_SAVED + 20 }, (_, i) => withColors(one, ['#' + String(i).padStart(6, '0')]))];
    const back = parseFinds(serializeFinds(many, new Set([keyOf(all[1]!)])));
    expect(back).toHaveLength(MAX_SAVED);
    expect(keyOf(back[0]!)).toBe(keyOf(all[1]!));
  });

  it('renames weaves saved under their old names, braid name included', () => {
    const [card] = sample();
    const old = { ...card!, profile: { ...card!.profile, traits: { ...card!.profile.traits, weave: 'twill' }, name: '8-strand twill wave cord' } };
    const [back] = parseFinds(JSON.stringify([old]));
    expect(back!.profile.traits.weave).toBe('regular');
    expect(back!.profile.name).toMatch(/^\d+-strand regular /);
  });

  it('ignores anything that is not a list of finds', () => {
    expect(parseFinds(null)).toEqual([]);
    expect(parseFinds('not json')).toEqual([]);
    expect(parseFinds('{"a":1}')).toEqual([]);
    expect(parseFinds('[{"setup":{"pattern":1}}, null]')).toEqual([]);
    // the card shape from before disk setups: skipped
    expect(parseFinds('[{"find":{"pattern":"1*2","slots":4,"threads":[0,1],"profile":{"signature":"x"}},"colors":["#000"]}]')).toEqual([]);
  });
});
