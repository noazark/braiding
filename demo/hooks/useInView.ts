import { useEffect, useState, type RefObject } from 'react';

/** Becomes true once the element comes near the viewport (or `root`), and stays true. */
export function useInView(ref: RefObject<Element | null>, root?: RefObject<Element | null>, rootMargin = '100% 0px') {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && setSeen(true), { root: root?.current ?? null, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root, rootMargin, seen]);
  return seen;
}
