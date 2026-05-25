export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export interface GanttItem {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  color?: string;
  progress?: number; // 0-100
  type: 'epic' | 'milestone' | 'sprint';
  children?: GanttItem[];
  dependsOn?: string[]; // ids of blocking items
}

export interface GanttProps {
  items: GanttItem[];
  zoom?: ZoomLevel;
  onZoomChange?: (zoom: ZoomLevel) => void;
  onItemResize?: (id: string, start: Date, end: Date) => void;
  onItemClick?: (item: GanttItem) => void;
  className?: string;
}
