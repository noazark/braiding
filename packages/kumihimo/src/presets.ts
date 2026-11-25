/**
 * Classic braids to start from.
 *
 * Each preset is checked (by this package's tests) to make a real braid: connected, woven, and with
 * no stacked or empty-slot moves.
 *
 * Like a {@link Setup}, a preset knows its threads only by index: how they look is up to the app.
 *
 * @module
 */

import type { Setup } from './disk.js';

/** The families presets are grouped in. */
export type PresetGroup = 'kongo-gumi' | 'classic' | 'gap' | 'weave';

/** Display names for {@link PresetGroup}s. */
export const presetGroupNames: Readonly<Record<PresetGroup, string>> = {
  'kongo-gumi': 'Round (Kongō Gumi)',
  classic: 'Classic structures',
  gap: 'Gap braids (card style)',
  weave: 'Weaves (swaps)',
};

/** One classic braid: a disk, threads and the pattern to play. */
export interface Preset {
  readonly id: string;
  readonly group: PresetGroup;
  readonly name: string;
  readonly slots: number;
  /** The starting slot (0-based) of each thread, as in {@link Setup}. A thread's index is its id. */
  readonly threads: readonly number[];
  /** The pattern in notation. */
  readonly pattern: string;
}

const preset = (id: string, group: PresetGroup, name: string, slots: number, threads: number[], pattern: string): Preset => ({
  id,
  group,
  name,
  slots,
  threads,
  pattern,
});

/** The built-in presets, in display order. */
export const presets: readonly Preset[] = [
  preset("kongo-gumi-spiral-8-threads", "kongo-gumi", "Kongō Gumi spiral, 8 threads", 32, [0, 7, 8, 15, 16, 23, 24, 31], "1>15 17>31 R-8 1>15 17>31 R-9"),
  preset("kongo-gumi-12-threads", "kongo-gumi", "Kongō Gumi, 12 threads", 32, [0, 1, 7, 8, 9, 15, 16, 17, 23, 24, 25, 31], "2>15 18>31 R-8 2>15 18>31 R-9"),
  preset("kongo-gumi-16-threads", "kongo-gumi", "Kongō Gumi, 16 threads", 32, [0, 1, 6, 7, 8, 9, 14, 15, 16, 17, 22, 23, 24, 25, 30, 31], "2>14 18>30 R-8 2>14 18>30 R-9"),
  preset("zigzag-turns-back-and-forth-8-threads", "kongo-gumi", "Zigzag (turns back and forth), 8 threads", 32, [0, 7, 8, 15, 16, 23, 24, 31], "1>15 17>31 R-8 1>15 17>31 R+7"),
  preset("maru-yotsu-round-4-threads", "classic", "Maru Yotsu (round, 4 threads)", 4, [0, 1, 2, 3], "2*1 4*3 R1 1*2 3*4 R1"),
  preset("edo-yatsu-hollow-round-8-threads", "classic", "Edo Yatsu (hollow round, 8 threads)", 8, [0, 1, 2, 3, 4, 5, 6, 7], "4*3 8*7 2*1 1*8 6*5 5*4 5*6 1*2 1*2 2*3 5*6 6*7"),
  preset("kaku-yatsu-square-8-threads", "classic", "Kaku Yatsu (square, 8 threads)", 8, [0, 1, 2, 3, 4, 5, 6, 7], "1*8 8*7 7*6 2*3 3*4 4*5 4*3 3*2 7*8 8*1 1*2 7*6 6*5 5*4 8*1 1*2 2*3 2*1 1*8 5*6 6*7"),
  preset("square-braid-16-threads", "classic", "Square braid (16 threads)", 32, [0, 1, 2, 7, 8, 9, 10, 15, 16, 17, 18, 23, 24, 25, 26, 31], "1>20 2>15 18>31 17>4 32>1 31>32 3>2 4>3 16>17 15>16 19>18 20>19 R8"),
  preset("7-strand-over-2", "gap", "7-strand, over 2", 8, [0, 1, 2, 3, 4, 5, 6], "E+3>E"),
  preset("10-strand-over-2", "gap", "10-strand, over 2", 11, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "E+3>E"),
  preset("10-strand-over-3", "gap", "10-strand, over 3", 11, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "E+4>E"),
  preset("11-strand-over-4", "gap", "11-strand, over 4", 12, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "E+5>E"),
  preset("12-strand-over-4", "gap", "12-strand, over 4", 13, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "E+5>E"),
  preset("13-strand-over-2", "gap", "13-strand, over 2", 14, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "E+3>E"),
  preset("13-strand-over-4", "gap", "13-strand, over 4", 14, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "E+5>E"),
  preset("14-strand-over-3", "gap", "14-strand, over 3", 15, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "E+4>E"),
  preset("15-strand-over-6", "gap", "15-strand, over 6", 16, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], "E+7>E"),
  preset("basket-weave-6-threads", "weave", "Basket weave, 6 threads", 6, [0, 1, 2, 3, 4, 5], "1*2 3*4 5*6 3*2 5*4 1*6"),
  preset("basket-weave-8-threads", "weave", "Basket weave, 8 threads", 8, [0, 1, 2, 3, 4, 5, 6, 7], "1*2 3*4 5*6 7*8 3*2 5*4 7*6 1*8"),
  preset("basket-weave-12-threads", "weave", "Basket weave, 12 threads", 12, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "1*2 3*4 5*6 7*8 9*10 11*12 3*2 5*4 7*6 9*8 11*10 1*12"),
  preset("basket-weave-16-threads", "weave", "Basket weave, 16 threads", 16, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "1*2 3*4 5*6 7*8 9*10 11*12 13*14 15*16 3*2 5*4 7*6 9*8 11*10 13*12 15*14 1*16"),
  preset("basket-weave-24-threads", "weave", "Basket weave, 24 threads", 24, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], "1*2 3*4 5*6 7*8 9*10 11*12 13*14 15*16 17*18 19*20 21*22 23*24 3*2 5*4 7*6 9*8 11*10 13*12 15*14 17*16 19*18 21*20 23*22 1*24"),
];
