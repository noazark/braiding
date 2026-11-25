import { describe, expect, it } from 'vitest';
import { parseLikes, serializeLikes } from './likes';

describe('saving likes', () => {
  it('round-trips', () => {
    const likes = new Set(['8|0:1,1:-1', '4|0:1']);
    expect(parseLikes(serializeLikes(likes))).toEqual(likes);
  });
  it('ignores anything that is not a list of signatures', () => {
    expect(parseLikes(null)).toEqual(new Set());
    expect(parseLikes('nope')).toEqual(new Set());
    expect(parseLikes('[1, "a", null]')).toEqual(new Set(['a']));
  });
});
