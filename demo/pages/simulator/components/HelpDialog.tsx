import { useEffect, useId, type ReactNode, type Ref, type RefObject } from 'react';

export interface HelpDialogProps {
  readonly ref: Ref<HTMLDialogElement>;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * A help text in a modal dialog, opened with `showModal()` by a (?) button. Closes with its Close
 * button, Esc, or a click outside it; focus goes back to the (?) on its own.
 */
export function HelpDialog({ ref, title, children }: HelpDialogProps) {
  const id = useId();
  useLightDismissFallback(ref as RefObject<HTMLDialogElement | null>);
  return (
    // closedby="any": a click outside closes it too
    <dialog className="helpdlg" ref={ref} aria-labelledby={id} {...({ closedby: 'any' } as object)}>
      <h1 id={id}>{title}</h1>
      {children}
      <form method="dialog">
        <button className="pri" autoFocus>
          Close
        </button>
      </form>
    </dialog>
  );
}

/** A small round (?) that opens a help dialog. */
export function HelpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="qhelp" title={label} aria-label={label} onClick={onClick}>
      ?
    </button>
  );
}

/**
 * Where `closedby` isn't supported (Safari), close on a press and release both outside the dialog's
 * box, so a text selection that ends on the backdrop doesn't close it.
 */
function useLightDismissFallback(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    const down = (e: PointerEvent) => (pressedOutside = outside(e));
    const up = (e: PointerEvent) => pressedOutside && outside(e) && dialog.close();
    dialog.addEventListener('pointerdown', down);
    dialog.addEventListener('pointerup', up);
    return () => {
      dialog.removeEventListener('pointerdown', down);
      dialog.removeEventListener('pointerup', up);
    };
  }, [ref]);
}
