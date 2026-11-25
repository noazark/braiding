/**
 * The strand chart: a braid drawn flat, one column per thread, read top to bottom.
 *
 * Moves that touch different columns share a row. In each row the threads that stay put (or slide
 * over to close a gap) are drawn first, and the moving threads on top with a gap cut around them,
 * so over and under read at a glance. The full-color band is one turn around the cord; faded copies
 * on either side show how it wraps.
 *
 * The chart only draws. Everything it knows about the braid comes from a {@link Timeline}.
 */
import { mod, type Step, type Timeline } from 'kumihimo';

export interface ChartStyle {
  readonly bg: string;
  readonly accent: string;
  /** Thread width, px. */
  readonly tw: number;
  /** Outline color, or none. */
  readonly outline?: string;
  /** Outline width, px. */
  readonly ow?: number;
}

export interface ChartOptions {
  readonly timeline: Timeline;
  /** CSS color per thread id. */
  readonly colors: readonly string[];
  /** Column spacing, px. */
  readonly width: number;
  /** Crossing steepness, 0…1: how tall a row is per column crossed. */
  readonly height: number;
  /**
   * Bend roundness: 0…1 is a share of the largest radius each bend can take; above 1 (up to 2) a
   * crossing becomes one S-curve that leaves and arrives vertically, fuller as it rises.
   */
  readonly corner: number;
  /** Mark this step and draw around it. */
  readonly playhead?: number;
  readonly style: ChartStyle;
  /** CSS pixels: width, and the minimum height to fill. */
  readonly size: { readonly w: number; readonly h: number };
}

export interface ChartResult {
  readonly height: number;
  /** Where the playhead line is, if it was drawn. */
  readonly playheadY: number | null;
  /** The last step drawn. */
  readonly steps: number;
}

type Row = [from: number, to: number];
type Pt = [number, number];
type Path = Pt[] & { s?: boolean; m0?: number; m1?: number };

/** Rows of moves (moves that don't touch the same columns share a row) and their heights. */
function layout(H: readonly Step[], T: number, cw: number, slope: number, b0: number, b1: number) {
  const lw = 6;
  const top = 8;
  const pad = lw + 1;
  const rows: Row[] = [];
  let used = new Set<number>();
  let start = b0;
  for (let s = b0 + 1; s <= b1; s++) {
    const mv = H[s]!.move!;
    const c0 = H[s - 1]!.columns[mv.thread]!;
    const arc: number[] = [];
    for (let k = 0; k <= Math.abs(mv.shift); k++) arc.push(mod(c0 + Math.sign(mv.shift) * k, T));
    if (arc.some(x => used.has(x))) {
      rows.push([start, s - 1]);
      start = s - 1;
      used = new Set();
    }
    arc.forEach(x => used.add(x));
  }
  if (b1 > b0) rows.push([start, b1]);
  /** How far thread `id` drifts over steps s0…s1, in columns. */
  const delta = (s0: number, s1: number, id: number) => {
    let d = 0;
    for (let s = s0 + 1; s <= s1; s++) {
      const mv = H[s]!.move!;
      if (id === mv.thread) d += mv.shift;
      else if (id === mv.partner) d += mv.partnerShift!;
      else {
        let x = H[s]!.columns[id]! - H[s - 1]!.columns[id]!;
        if (x > T / 2) x -= T;
        if (x < -T / 2) x += T;
        d += x;
      }
    }
    return d;
  };
  const Yr = [top];
  rows.forEach(([s0, s1]) => {
    let m = 0;
    for (let s = s0 + 1; s <= s1; s++) m = Math.max(m, Math.abs(H[s]!.move!.shift));
    Yr.push(Yr.at(-1)! + pad * 2 + Math.max(2, m * cw * slope));
  });
  return { lw, RW: T * cw, top, pad, rows, Yr, delta };
}

/** Draw the chart into `canvas`, sized to fit. */
export function renderChart(canvas: HTMLCanvasElement, cfg: ChartOptions): ChartResult {
  const tl = cfg.timeline;
  const T = Math.max(1, cfg.colors.length);
  const cw = cfg.width;
  const st = cfg.style;
  const W = cfg.size.w;
  const BH = cfg.size.h;
  const cur = cfg.playhead ?? 0;
  // start from the first move, or (far into a run) from an earlier checkpoint in blocks of 100 so rows don't re-pack each step
  const b0 = Math.max(0, Math.floor((cur - 200) / 100) * 100);
  let M = b0 + 24;
  let L: ReturnType<typeof layout>;
  let last: number;
  for (;;) {
    tl.extend(M);
    last = Math.min(M, tl.last);
    L = layout(tl.steps, T, cw, cfg.height, b0, last);
    if ((L.Yr.at(-1)! + L.top >= BH && last >= cur + 40) || tl.finished || M >= b0 + 2400) break;
    M += 24;
  }
  const H = tl.steps;
  const { lw, RW, pad, rows, Yr, delta } = L;
  const height = Yr.at(-1)! + L.top;

  // canvas at device resolution
  const dpr = devicePixelRatio || 1;
  const q = (v: number) => Math.round(v * dpr) / dpr;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = height + 'px';
  const c = canvas.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const CB = st.bg;
  const colors = cfg.colors;
  // crisp at any screen scale: whole-device-pixel widths; thread and outline thickness shrink with the column spacing
  const TW = Math.max(2, 2 * Math.round((Math.min(st.tw, Math.max(2, cw * 0.3)) * dpr) / 2)) / dpr;
  const OW = st.outline ? Math.max(1, Math.round(Math.min(st.ow ?? 2, Math.max(1, cw * 0.08)) * dpr)) / dpr : 0;
  c.fillStyle = CB;
  c.fillRect(0, 0, W, height);
  const x0 = q((W - RW) / 2);
  const reps: number[] = [];
  for (let k = -Math.ceil(x0 / RW) - 1; x0 + k * RW < W + RW; k++) reps.push(x0 + k * RW);
  const X = (s: number) => q((s + 0.5) * cw);
  const Y = (r: number) => q(Yr[r]!);

  const CF = Math.max(0, Math.min(2, cfg.corner ?? 0.7));
  const SK = CF > 1 ? 0.3 + (CF - 1) * 0.4 : 0;
  const bez = (p0: Pt, p3: Pt, t: number): Pt => {
    const dy = p3[1] - p0[1];
    const c1 = [p0[0], p0[1] + dy * SK];
    const c2 = [p3[0], p3[1] - dy * SK];
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * c1[0]! + 3 * u * t * t * c2[0]! + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1]! + 3 * u * t * t * c2[1]! + t * t * t * p3[1],
    ];
  };
  const trace = (pts: Path, sh: number) => {
    c.moveTo(pts[0]![0] + sh, pts[0]![1]);
    if (SK && pts.s) {
      const [xa, ya] = pts[0]!;
      const [xb, yb] = pts[3]!;
      const dy = yb - ya;
      const m0 = pts.m0 || 0;
      const m1 = pts.m1 || 0;
      c.bezierCurveTo(xa + (m0 * dy) / 3 + sh, ya + dy * (m0 ? 1 / 3 : SK), xb - (m1 * dy) / 3 + sh, yb - dy * (m1 ? 1 / 3 : SK), xb + sh, yb);
      return;
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i - 1]!;
      const [bx, by] = pts[i]!;
      const [nx, ny] = pts[i + 1]!;
      const n = pts.length;
      const r = Math.min(1, CF) * Math.min(Math.hypot(bx - ax, by - ay) / (i === 1 ? 1 : 2), Math.hypot(nx - bx, ny - by) / (i === n - 2 ? 1 : 2));
      if (r > 0.5) c.arcTo(bx + sh, by, nx + sh, ny, r);
      else c.lineTo(bx + sh, by);
    }
    const [lx, ly] = pts.at(-1)!;
    c.lineTo(lx + sh, ly);
  };
  const line = (pts: Path, col: string, w: number) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    for (const sh of reps) {
      c.beginPath();
      trace(pts, sh);
      c.stroke();
    }
  };
  const thread = (pts: Path, col: string) => {
    if (st.outline) {
      c.lineCap = 'butt';
      line(pts, st.outline, TW + OW * 2);
    }
    c.lineCap = st.outline ? 'butt' : 'round';
    line(pts, col, TW);
  };
  // how far each thread drifts in each row, so a thread heading the same way over several rows is drawn
  // as one smooth sweep instead of a staircase of S-bends; it straightens up only where it stops or turns
  const D = rows.map(([s0, s1]) => Array.from({ length: T }, (_, id) => delta(s0, s1, id)));
  const slopeAt = (k: number, id: number) => {
    const a = k > 0 ? (D[k - 1]![id]! * cw) / (Yr[k]! - Yr[k - 1]!) : 0;
    const b = k < rows.length ? (D[k]![id]! * cw) / (Yr[k + 1]! - Yr[k]!) : 0;
    return a * b > 0 ? (2 * a * b) / (a + b) : 0;
  };
  const path = (r: number, xa: number, xb: number, id?: number): Path => {
    const p = (
      [
        [xa, Y(r)],
        [xa, Y(r) + pad],
        [xb, Y(r + 1) - pad],
        [xb, Y(r + 1)],
      ] as Pt[]
    ).map(([x, y]) => [q(x), q(y)] as Pt) as Path;
    p.s = xa !== xb;
    if (id != null) {
      p.m0 = slopeAt(r, id);
      p.m1 = slopeAt(r + 1, id);
    }
    return p;
  };
  c.lineJoin = 'round';
  const pass = () => {
    // each thread runs straight in from the top edge to the first row, and out from the last row to the
    // bottom edge, so the chart has no blank strips at either end
    const lead = (cols: readonly number[], y0: number, y1: number) =>
      cols.forEach((c, id) => {
        const x = X(c);
        thread(
          [
            [x, y0],
            [x, y1],
          ] as Path,
          colors[id]!,
        );
      });
    lead(H[b0]!.columns, 0, Y(0));
    lead(H[last]!.columns, Y(rows.length), height);
    // threads that stay put or shift over to close the gap: underneath
    rows.forEach(([s0, s1], r) => {
      const p = H[s0]!.columns;
      const moving = new Set<number>();
      for (let s = s0 + 1; s <= s1; s++) {
        const mv = H[s]!.move!;
        moving.add(mv.thread);
        if (mv.partner != null) moving.add(mv.partner);
      }
      for (let id = 0; id < p.length; id++) {
        if (moving.has(id)) continue;
        const xa = X(p[id]!);
        thread(path(r, xa, xa + D[r]![id]! * cw, id), colors[id]!);
      }
    });
    // the moving thread(s): on top, with a gap cut around them
    rows.forEach(([s0, s1], r) => {
      for (let s = s0 + 1; s <= s1; s++) {
        const mv = H[s]!.move!;
        const movers: [number | undefined, number | undefined][] = [
          [mv.partner, mv.partnerShift],
          [mv.thread, mv.shift],
        ];
        for (const [id, d] of movers) {
          if (id == null || d == null) continue;
          const xa = X(H[s0]!.columns[id]!);
          const xb = xa + d * cw;
          const ya = Y(r) + pad;
          const yb = Y(r + 1) - pad;
          const ang = Math.atan2(yb - ya, d * cw);
          const ex = Math.cos(ang) * lw * 0.9;
          const ey = Math.sin(ang) * lw * 0.9;
          if (d && !st.outline) {
            c.lineCap = 'butt';
            const gw = TW + OW * 2 + Math.min(5, cw * 0.25);
            if (SK) {
              const P = path(r, xa, xb);
              const pts: Path = [];
              for (let k = 0; k <= 16; k++) pts.push(bez(P[0]!, P[3]!, 0.14 + (0.72 * k) / 16));
              line(pts, CB, gw);
            } else
              line(
                [
                  [xa + ex, ya + ey],
                  [xb - ex, yb - ey],
                ],
                CB,
                gw,
              );
          }
          thread(path(r, xa, xb, id), colors[id]!);
        }
      }
    });
  };
  // every copy, dimmed; then one full turn (the band) again at full strength. The band's edges fall between
  // the last and first columns, so a crossing over the seam leaves one edge and comes back in at the other.
  pass();
  c.globalAlpha = 0.72;
  c.fillStyle = CB;
  c.fillRect(0, 0, W, height);
  c.globalAlpha = 1;
  c.save();
  c.beginPath();
  c.rect(x0, 0, RW, height);
  c.clip();
  c.fillStyle = CB;
  c.fillRect(x0, 0, RW, height);
  c.fillStyle = '#ffffff10';
  c.fillRect(x0, 0, RW, height);
  pass();
  c.restore();

  // the playhead
  let ym: number | null = null;
  if (cfg.playhead != null) {
    if (cur === b0) ym = Yr[0]!;
    else if (cur <= last)
      rows.forEach(([s0, s1], r) => {
        if (cur > s0 && cur <= s1) ym = Yr[r + 1]!;
      });
  }
  if (ym != null) {
    c.strokeStyle = st.accent;
    c.lineWidth = 2;
    c.setLineDash([6, 5]);
    c.beginPath();
    c.moveTo(0, ym);
    c.lineTo(W, ym);
    c.stroke();
    c.setLineDash([]);
  }
  return { height, playheadY: ym, steps: last };
}
