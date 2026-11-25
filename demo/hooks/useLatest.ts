import { useRef } from 'react';

/** A ref that always holds the latest value: for event handlers and timers that outlive a render. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
