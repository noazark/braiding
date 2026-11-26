/**
 * kumihimo: a pure, dependency-free engine for braiding disks.
 *
 * The pipeline, from writing to judging:
 *
 * ```text
 *  "1>15 17>31 R-8"  ──parsePattern──▶  Pattern
 *  Setup {slots, threads, pattern}  ──braid()──▶  Step, Step, Step, …   (a generator, forever)
 *                                    ──findRepeat──▶  Repeat (one period of the braid)
 *                                    ──crossingsOf──▶  Word  (neighbor crossings, Artin style)
 *  Word  ──reduceWord / simplifyWord / normalForm──▶  shorter, comparable words
 *  Setup ──checkPattern──▶  Finding[]       (what's wrong, as data)
 *  Setup ──profileBraid──▶  BraidProfile    (round/flat, traits, name, signature)
 * ```
 *
 * Everything is a pure function of its inputs (randomness is always passed in), and all data is
 * plain, immutable objects.
 *
 * @packageDocumentation
 */

export { mod, ringDistance } from './ring.js';
export { seeded, randomInt, pickOne, type Random } from './random.js';
export {
  parsePattern,
  formatPattern,
  formatToken,
  formatSlotRef,
  renumberPattern,
  splitTokens,
  usesGap,
  type Pattern,
  type Token,
  type MoveToken,
  type TurnToken,
  type SlotRef,
  type NotationError,
  type ParseResult,
} from './notation.js';
export { braid, Timeline, type Setup, type Step, type Move, type Halt } from './disk.js';
export { findRepeat, type Repeat } from './repeat.js';
export {
  commutes,
  reduceWord,
  simplifyWord,
  normalForm,
  wordRoot,
  repeatWord,
  wordToNotation,
  wordKey,
  crossingKey,
  type Crossing,
  type Word,
  type Sign,
  type ReduceOptions,
  type SimplifyOptions,
} from './word.js';
export { crossingsOf, type RepeatWord } from './crossings.js';
export {
  checkPattern,
  hasErrors,
  problems,
  type Finding,
  type FindingCode,
  type Level,
  type Scope,
  type CheckOptions,
} from './check.js';
export {
  profileBraid,
  signatureOf,
  shortestSignature,
  describeTraits,
  braidName,
  WEAVES,
  type BraidProfile,
  type ProfileResult,
  type ProfileOptions,
  type Rejection,
  type Traits,
  type Weave,
  type Drift,
} from './profile.js';
export { generators, randomDiskPattern, randomSwapPattern, randomGapPattern, type Candidate, type Family } from './generate.js';
export { refineCandidate, profileNotation, type Find } from './explore.js';
export { presets, presetGroupNames, type Preset, type PresetGroup } from './presets.js';
