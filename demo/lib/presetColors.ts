/**
 * The presets in their default colors. The engine knows threads only by index, so the coloring
 * lives here: for each preset (by id), one palette index per thread, in the preset's thread order.
 * Threads with the same index look the same.
 */
export const PRESET_COLORS: Readonly<Record<string, readonly number[]>> = {
  'kongo-gumi-spiral-8-threads': [0, 5, 5, 0, 0, 5, 5, 0],
  'kongo-gumi-12-threads': [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0],
  'kongo-gumi-16-threads': [0, 5, 5, 2, 2, 5, 5, 0, 0, 5, 5, 2, 2, 5, 5, 0],
  'zigzag-turns-back-and-forth-8-threads': [0, 0, 0, 2, 2, 2, 2, 0],
  'maru-yotsu-round-4-threads': [0, 5, 0, 5],
  'edo-yatsu-hollow-round-8-threads': [0, 5, 0, 5, 0, 5, 0, 5],
  'kaku-yatsu-square-8-threads': [0, 0, 5, 5, 2, 2, 5, 5],
  'square-braid-16-threads': [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0],
  '7-strand-over-2': [0, 5, 5, 5, 5, 5, 5],
  '10-strand-over-2': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '10-strand-over-3': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '11-strand-over-4': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '12-strand-over-4': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '13-strand-over-2': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '13-strand-over-4': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '14-strand-over-3': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  '15-strand-over-6': [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  'basket-weave-6-threads': [0, 1, 2, 3, 0, 1],
  'basket-weave-8-threads': [0, 1, 2, 3, 0, 1, 2, 3],
  'basket-weave-12-threads': [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
  'basket-weave-16-threads': [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
  'basket-weave-24-threads': [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
};
