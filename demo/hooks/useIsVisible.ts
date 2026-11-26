import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the element is on screen right now (unlike `useInView`, this turns false again). A
 * `rootMargin` widens "on screen" to include that much around it.
 */
export function useIsVisible(ref: RefObject<Element | null>, rootMargin?: string) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(es => setVisible(es.some(e => e.isIntersecting)), rootMargin ? { rootMargin } : undefined);
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return visible;
}
