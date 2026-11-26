/**
 * A queue of work that waits for the page to load and then runs one job per frame, each just after
 * that frame is painted. Heavy setup (profiling presets, drawing charts) goes here so the page shows
 * up first and fills in a piece at a time while staying responsive. Jobs queued as `first` (what's
 * on screen) run ahead of the rest (background work).
 */

type Job = () => void;

const first = new Set<Job>();
const rest = new Set<Job>();
const waiting = () => first.size + rest.size;
let loaded = typeof document === 'undefined' || document.readyState === 'complete';
let pumping = false;

/** Run the next job after the coming paint, then go again while jobs are left. */
function pump() {
  if (pumping || !loaded || !waiting()) return;
  pumping = true;
  requestAnimationFrame(() =>
    // the timeout lands after the frame is painted, so each job's work shows up in the next one
    setTimeout(() => {
      pumping = false;
      const queue = first.size ? first : rest;
      const job = queue.values().next().value;
      if (job) {
        queue.delete(job);
        job();
      }
      pump();
    }),
  );
}

if (!loaded)
  addEventListener(
    'load',
    () => {
      loaded = true;
      pump();
    },
    { once: true },
  );

/**
 * Queue `job` to run once the page has loaded, after the jobs already waiting (with `first`, after
 * only the other `first` jobs). Returns a cancel.
 */
export function afterLoad(job: () => void, { first: isFirst = false } = {}): () => void {
  // each call gets its own entry, even for the same function
  const entry: Job = () => job();
  const queue = isFirst ? first : rest;
  queue.add(entry);
  pump();
  return () => {
    queue.delete(entry);
  };
}
