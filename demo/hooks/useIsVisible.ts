import { useEffect, useState, type RefObject } from 'react';

/** Whether the element is on screen right now (unlike `useInView`, this turns false again). */
export function useIsVisible(ref: RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(es => setVisible(es.some(e => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}
