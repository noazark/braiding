import type { Ref } from 'react';
import { HelpDialog } from './HelpDialog';

/** What each kind of move means, in a help dialog (the (?) next to Moves). */
export function NotationHelp({ ref }: { ref: Ref<HTMLDialogElement> }) {
  return (
    <HelpDialog ref={ref} title="Writing moves">
      <table>
        <tbody>
          <tr>
            <td>1&gt;15</td>
            <td>Move the thread in slot 1 to slot 15 (the usual disk instruction: “move 1 to 15”). It crosses over everything at the center.</td>
          </tr>
          <tr>
            <td>3*4</td>
            <td>Cross: the threads in 3 and 4 swap, the one from 3 going over.</td>
          </tr>
          <tr>
            <td>R-8</td>
            <td>Turn the disk: every slot number after this is shifted by −8 (cumulative). Lets you write one pass and repeat it as the disk rotates.</td>
          </tr>
          <tr>
            <td>E</td>
            <td>The empty slot: the one most recently vacated (at the start, the first empty slot). E+3 counts 3 slots clockwise from it.</td>
          </tr>
          <tr>
            <td>E+3&gt;E</td>
            <td>“Take the third thread clockwise from the gap and drop it into the gap”, the 7-strand card braid.</td>
          </tr>
        </tbody>
      </table>
      <p className="cap">
        Slots are numbered 1…N clockwise, slot 1 just right of the top. Separate moves with spaces or commas; the sequence repeats forever. Ctrl/⌘+Enter applies.
      </p>
    </HelpDialog>
  );
}
