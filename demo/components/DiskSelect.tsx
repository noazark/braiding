import { MY_DISKS, useMyDisk, type MyDisk } from '../lib/myDisk';

/** How each disk reads in the list. */
const label = (d: MyDisk) => (d === 'any' ? 'Any size' : `${d} slots`);

/**
 * The disk you braid on (see myDisk.ts), as a field among the others: the simulator's pattern and the
 * explorer's "Find a new braid" card. The same choice on both pages, remembered between visits.
 */
export function DiskSelect() {
  const [disk, setDisk] = useMyDisk();
  return (
    <label className="disksel" title="The disk you braid on: patterns open on it, and the explorer finds braids for it">
      Disk
      <select value={String(disk)} onChange={e => setDisk((e.target.value === 'any' ? 'any' : Number(e.target.value)) as MyDisk)}>
        {MY_DISKS.map(d => (
          <option key={d} value={String(d)}>
            {label(d)}
          </option>
        ))}
      </select>
    </label>
  );
}
