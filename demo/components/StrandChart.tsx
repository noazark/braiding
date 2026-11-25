import { useLayoutEffect, useRef } from 'react';
import type { Timeline } from 'kumihimo';
import { renderChart, type ChartResult, type ChartStyle } from '../lib/chart';
import { useLatest } from '../hooks/useLatest';

export interface StrandChartProps {
  readonly timeline: Timeline;
  readonly colors: readonly string[];
  /** Column spacing, px. */
  readonly columnWidth: number;
  /** Crossing steepness, 0…1. */
  readonly steepness: number;
  /** Bend roundness, 0…2. */
  readonly corner: number;
  readonly playhead?: number;
  readonly style: ChartStyle;
  /** Width to draw at, and the minimum height to fill, in CSS pixels. */
  readonly width: number;
  readonly minHeight: number;
  /** Called after each redraw, e.g. to scroll the playhead into view. */
  readonly onRender?: (result: ChartResult) => void;
}

/** The strand chart on a canvas. Redraws whenever any prop changes. */
export function StrandChart({ timeline, colors, columnWidth, steepness, corner, playhead, style, width, minHeight, onRender }: StrandChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const after = useLatest(onRender);
  const colorKey = colors.join(',');
  const styleKey = JSON.stringify(style);
  useLayoutEffect(() => {
    if (!canvas.current || width <= 0) return;
    const result = renderChart(canvas.current, {
      timeline,
      colors: colorKey ? colorKey.split(',') : [],
      width: columnWidth,
      height: steepness,
      corner,
      playhead,
      style: JSON.parse(styleKey) as ChartStyle,
      size: { w: width, h: minHeight },
    });
    after.current?.(result);
  }, [timeline, colorKey, columnWidth, steepness, corner, playhead, styleKey, width, minHeight, after]);
  return <canvas ref={canvas} />;
}
