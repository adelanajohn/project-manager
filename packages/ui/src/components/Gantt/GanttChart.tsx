import { useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import type { GanttProps, GanttItem, ZoomLevel } from './types';
import {
  generateColumns, dateToX, durationToWidth, formatHeader,
  colWidth, daysPerCol, addDays,
} from './utils';
import { cn } from '../../lib/utils';

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 240;
const ZOOM_LEVELS: ZoomLevel[] = ['day', 'week', 'month', 'quarter'];

function TodayLine({ timelineStart, zoom }: { timelineStart: Date; zoom: ZoomLevel }) {
  const x = dateToX(new Date(), timelineStart, zoom);
  return (
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={9999}
      stroke="#f43f5e"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.7}
    />
  );
}

function MilestoneDiamond({
  x, y, color, size = 10,
}: { x: number; y: number; color: string; size?: number }) {
  const half = size / 2;
  return (
    <polygon
      points={`${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`}
      fill={color}
      stroke="white"
      strokeWidth={1}
    />
  );
}

interface GanttBarProps {
  item: GanttItem;
  y: number;
  timelineStart: Date;
  zoom: ZoomLevel;
  onClick?: (item: GanttItem) => void;
}

function GanttBar({ item, y, timelineStart, zoom, onClick }: GanttBarProps) {
  if (!item.startDate || !item.endDate) return null;

  const x = dateToX(item.startDate, timelineStart, zoom);
  const width = durationToWidth(item.startDate, item.endDate, zoom);
  const barH = 24;
  const barY = y + (ROW_HEIGHT - barH) / 2;
  const color = item.color ?? '#6366f1';

  if (item.type === 'milestone') {
    return (
      <g
        onClick={() => onClick?.(item)}
        className="cursor-pointer"
        role="button"
        aria-label={item.title}
      >
        <MilestoneDiamond
          x={x}
          y={y + ROW_HEIGHT / 2}
          color={color}
          size={14}
        />
      </g>
    );
  }

  return (
    <g
      onClick={() => onClick?.(item)}
      className="cursor-pointer"
      role="button"
      aria-label={`${item.title}: ${Math.round(item.progress ?? 0)}% complete`}
    >
      {/* Background bar */}
      <rect
        x={x}
        y={barY}
        width={Math.max(8, width)}
        height={barH}
        rx={4}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={1}
      />
      {/* Progress fill */}
      {(item.progress ?? 0) > 0 && (
        <rect
          x={x}
          y={barY}
          width={Math.max(4, width * ((item.progress ?? 0) / 100))}
          height={barH}
          rx={4}
          fill={color}
          opacity={0.8}
        />
      )}
      {/* Label inside bar */}
      {width > 60 && (
        <text
          x={x + 8}
          y={barY + barH / 2 + 4}
          fontSize={11}
          fill="white"
          fontWeight={500}
          style={{ userSelect: 'none' }}
        >
          {item.progress != null ? `${Math.round(item.progress)}%` : ''}
        </text>
      )}
    </g>
  );
}

export function GanttChart({
  items,
  zoom = 'month',
  onZoomChange,
  onItemClick,
  className,
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Flatten items for rendering
  const flatItems = useMemo(() => {
    const result: Array<{ item: GanttItem; depth: number }> = [];
    function walk(item: GanttItem, depth: number) {
      result.push({ item, depth });
      if (expandedIds.has(item.id) && item.children?.length) {
        item.children.forEach((child) => walk(child, depth + 1));
      }
    }
    items.forEach((item) => walk(item, 0));
    return result;
  }, [items, expandedIds]);

  // Compute timeline bounds
  const { timelineStart, timelineEnd } = useMemo(() => {
    const dates: Date[] = [];
    function collect(item: GanttItem) {
      if (item.startDate) dates.push(item.startDate);
      if (item.endDate) dates.push(item.endDate);
      item.children?.forEach(collect);
    }
    items.forEach(collect);

    const today = new Date();
    const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : addDays(today, -30);
    const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : addDays(today, 60);

    return {
      timelineStart: addDays(minDate, -7),
      timelineEnd: addDays(maxDate, 14),
    };
  }, [items]);

  const columns = useMemo(
    () => generateColumns(timelineStart, timelineEnd, zoom),
    [timelineStart, timelineEnd, zoom]
  );

  const totalWidth = columns.length * colWidth(zoom);
  const totalHeight = flatItems.length * ROW_HEIGHT;

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) onZoomChange?.(ZOOM_LEVELS[idx - 1]);
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) onZoomChange?.(ZOOM_LEVELS[idx + 1]);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>Roadmap</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom level tabs */}
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z}
                onClick={() => onZoomChange?.(z)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize',
                  zoom === z
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {z}
              </button>
            ))}
          </div>
          <button onClick={zoomIn} className="p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)]" aria-label="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button onClick={zoomOut} className="p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)]" aria-label="Zoom out">
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Row labels (frozen left pane) */}
        <div
          className="flex-shrink-0 overflow-hidden border-r"
          style={{ width: LABEL_WIDTH, borderColor: 'var(--border)' }}
        >
          {/* Header spacer */}
          <div
            className="h-8 border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          />
          {flatItems.map(({ item, depth }) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 h-[44px] border-b hover:bg-white/5 cursor-default"
              style={{ borderColor: 'var(--border)', paddingLeft: 12 + depth * 16 }}
            >
              {item.children?.length ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-4 h-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0"
                  aria-expanded={expandedIds.has(item.id)}
                >
                  {expandedIds.has(item.id) ? '▾' : '▸'}
                </button>
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: item.color ?? '#6366f1' }}
              />
              <span
                className="text-xs truncate"
                style={{ color: 'var(--text-primary)' }}
                title={item.title}
              >
                {item.title}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <svg
            width={totalWidth}
            height={32 + totalHeight}
            style={{ display: 'block', minWidth: totalWidth }}
          >
            {/* Column headers */}
            <g>
              {columns.map((col, i) => (
                <g key={i}>
                  <rect
                    x={i * colWidth(zoom)}
                    y={0}
                    width={colWidth(zoom)}
                    height={32}
                    fill="var(--bg-secondary)"
                    stroke="var(--border)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={i * colWidth(zoom) + colWidth(zoom) / 2}
                    y={20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--text-muted)"
                    fontFamily="Inter, sans-serif"
                    style={{ userSelect: 'none' }}
                  >
                    {formatHeader(col, zoom)}
                  </text>
                </g>
              ))}
            </g>

            {/* Row backgrounds */}
            {flatItems.map(({ item }, rowIdx) => (
              <rect
                key={`row-bg-${item.id}`}
                x={0}
                y={32 + rowIdx * ROW_HEIGHT}
                width={totalWidth}
                height={ROW_HEIGHT}
                fill={rowIdx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'}
                opacity={0.5}
              />
            ))}

            {/* Column grid lines */}
            {columns.map((_, i) => (
              <line
                key={`col-line-${i}`}
                x1={i * colWidth(zoom)}
                x2={i * colWidth(zoom)}
                y1={32}
                y2={32 + totalHeight}
                stroke="var(--border)"
                strokeWidth={0.5}
                opacity={0.5}
              />
            ))}

            {/* Today line */}
            <g transform={`translate(0, 32)`}>
              <TodayLine timelineStart={timelineStart} zoom={zoom} />
            </g>

            {/* Bars */}
            {flatItems.map(({ item }, rowIdx) => (
              <g key={`bar-${item.id}`} transform={`translate(0, 32)`}>
                <GanttBar
                  item={item}
                  y={rowIdx * ROW_HEIGHT}
                  timelineStart={timelineStart}
                  zoom={zoom}
                  onClick={onItemClick}
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          No epics or milestones to display. Create some to see the roadmap.
        </div>
      )}
    </div>
  );
}
