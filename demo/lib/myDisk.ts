/**
 * The disk you braid on: 8, 16 or 32 slots, or any size (3 to 32). Both pages are built around it:
 * patterns open on it and the explorer finds braids for it. It's remembered between visits and shared
 * by every page and tab; 16 slots until you say otherwise.
 */
import { useSyncExternalStore } from 'react';
import { snapSlots, scalesTo, resizeSetup } from './diskSize';
import type { DiskSetup } from './diskSetup';

export type MyDisk = 8 | 16 | 32 | 'any';

export const MY_DISKS: readonly MyDisk[] = [8, 16, 32, 'any'];
export const DEFAULT_DISK: MyDisk = 16;
/** The largest disk "any" goes up to. */
export const MAX_SLOTS = 32;

/** How a disk reads: "16-slot disk", or "Any disk". */
export const diskLabel = (d: MyDisk): string => (d === 'any' ? 'Any disk' : `${d}-slot disk`);

const KEY = 'braid:disk:v1';
const parse = (v: string | null): MyDisk => (v === 'any' ? 'any' : v === '8' || v === '16' || v === '32' ? (Number(v) as MyDisk) : DEFAULT_DISK);

export function loadDisk(): MyDisk {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_DISK;
  }
}

// pages on this tab hear about a change through this; other tabs through the storage event
const listeners = new Set<() => void>();

export function saveDisk(d: MyDisk): void {
  try {
    localStorage.setItem(KEY, String(d));
  } catch {
    /* not remembered, but still used for this visit */
  }
  current = d;
  listeners.forEach(l => l());
}

let current: MyDisk | null = null;
const read = () => (current ??= loadDisk());
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = parse(e.newValue);
    l();
  };
  addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    removeEventListener('storage', onStorage);
  };
};

/** The disk you braid on, and a way to change it. Every user of it updates when it changes. */
export function useMyDisk(): [MyDisk, (d: MyDisk) => void] {
  return [useSyncExternalStore(subscribe, read, () => DEFAULT_DISK), saveDisk];
}

/**
 * A setup moved onto your disk, the same braid. On a fixed disk, `fits` is false when it can't go there,
 * and the setup comes back as it was. On any disk it stays at its own size, unless that's past
 * {@link MAX_SLOTS}: then it goes on the biggest size it can.
 */
export function onMyDisk(s: DiskSetup, d: MyDisk): { setup: DiskSetup; fits: boolean } {
  if (d === 'any') {
    if (s.slots <= MAX_SLOTS) return { setup: s, fits: true };
    const n = snapSlots(s, s.slots, MAX_SLOTS, Math.max(3, s.threads.length), MAX_SLOTS);
    const moved = n <= MAX_SLOTS ? resizeSetup(s, n) : null;
    return moved ? { setup: moved, fits: true } : { setup: s, fits: false };
  }
  const moved = resizeSetup(s, d);
  return moved ? { setup: moved, fits: true } : { setup: s, fits: false };
}

/** Whether a setup can be braided on your disk. */
export const fitsMyDisk = (s: DiskSetup, d: MyDisk): boolean => (d === 'any' ? s.slots <= MAX_SLOTS || onMyDisk(s, d).fits : scalesTo(s, d));

const smallest = new WeakMap<DiskSetup, number>();

/**
 * The smallest standard disk (8, 16 or 32 slots) a braid can go on; for one that goes on none of
 * them, its own slot count.
 */
export function smallestDisk(s: DiskSetup): number {
  let n = smallest.get(s);
  if (n === undefined) {
    n = ([8, 16, 32] as const).find(d => s.slots === d || resizeSetup(s, d)) ?? s.slots;
    smallest.set(s, n);
  }
  return n;
}
