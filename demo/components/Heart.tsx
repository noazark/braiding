/** The heart path, in a 24×24 box. One shape for every heart on the site. */
export const HEART_PATH = 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z';

/**
 * A square box centered on the heart itself (it spans x 4–20, y 5.5–21, so its middle is (12, 13.3), not
 * the 24×24 box's (12, 12)). Drawn in this box, the heart sits dead center wherever it's placed.
 */
export const HEART_VIEWBOX = '3.5 4.75 17 17';

/** A heart the size of the text around it, in the current text color. Always square, so never stretched. */
export function Heart({ className }: { className?: string }) {
  return (
    <svg className={'heart' + (className ? ' ' + className : '')} viewBox={HEART_VIEWBOX} width="1em" height="1em" aria-hidden="true">
      <path d={HEART_PATH} fill="currentColor" />
    </svg>
  );
}
