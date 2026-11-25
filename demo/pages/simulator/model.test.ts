import { describe, expect, it } from 'vitest';
import { ERASER, OFF_DISK, applyDrop, slotAt, slotPoint } from './model';
import type { DiskThread } from '../../lib/diskSetup';

const [RED, GOLD, BLUE, GREEN] = ['#e4572e', '#f3b31b', '#2e86ab', '#8cc63f'];

const T: DiskThread[] = [
  { slot: 0, color: RED },
  { slot: 4, color: GOLD },
];

describe('editing the disk by hand', () => {
  it('paints a clicked thread, and keeps the preset', () => {
    expect(applyDrop(T, { kind: 'thread', ix: 0, color: RED, slot: 0 }, false, 0, GREEN)).toEqual({ threads: [{ slot: 0, color: GREEN }, T[1]], colorOnly: true });
  });
  it('ignores a click that changes nothing', () => {
    expect(applyDrop(T, { kind: 'thread', ix: 0, color: RED, slot: 0 }, false, 0, RED)).toBeNull();
  });
  it('erases a clicked thread', () => {
    expect(applyDrop(T, { kind: 'thread', ix: 0, color: RED, slot: 0 }, false, 0, ERASER)?.threads).toEqual([T[1]]);
  });
  it('swaps when a thread is dragged onto another', () => {
    expect(applyDrop(T, { kind: 'thread', ix: 0, color: RED, slot: 0 }, true, 4, RED)?.threads).toEqual([
      { slot: 0, color: GOLD },
      { slot: 4, color: RED },
    ]);
  });
  it('removes a thread dragged off the disk', () => {
    expect(applyDrop(T, { kind: 'thread', ix: 1, color: GOLD, slot: 4 }, true, OFF_DISK, RED)?.threads).toEqual([T[0]]);
  });
  it('adds a thread from a swatch, in slot order', () => {
    expect(applyDrop(T, { kind: 'swatch', color: BLUE }, true, 2, BLUE)?.threads.map(t => t.slot)).toEqual([0, 2, 4]);
  });
  it('does not touch the caller’s array', () => {
    const before = JSON.stringify(T);
    applyDrop(T, { kind: 'thread', ix: 0, color: RED, slot: 0 }, true, 4, RED);
    expect(JSON.stringify(T)).toBe(before);
  });
});

describe('disk geometry', () => {
  it('finds the slot under each slot’s own point', () => {
    for (const n of [4, 8, 32]) for (let i = 0; i < n; i++) expect(slotAt(...slotPoint(i, 182, n), n)).toBe(i);
  });
});
