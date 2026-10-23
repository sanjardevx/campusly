import { useState, type DragEvent } from 'react';

/**
 * Native HTML5 drag and drop for one list (no library, DECISIONS): drag a row by its handle, drop
 * it on another row, and `onMove` gets the whole list of ids in the new order (what the reorder
 * APIs expect). "Move up / Move down" in the ⋯ menu covers keyboard and touch.
 */
export function useDragList(ids: string[], onMove: (ids: string[]) => void) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = (id: string, to: number) => {
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    onMove(next);
  };

  /** Props for a row: it is a drop target; `handle` props start the drag */
  const rowProps = (id: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragged || dragged === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOver(id);
    },
    onDragLeave: () => setOver((o) => (o === id ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragged) move(dragged, ids.indexOf(id));
      setDragged(null);
      setOver(null);
    },
    'data-dragging': dragged === id || undefined,
    'data-over': over === id || undefined,
  });

  const handleProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      // Firefox starts a drag only when some data is set
      e.dataTransfer.setData('text/plain', id);
      setDragged(id);
    },
    onDragEnd: () => {
      setDragged(null);
      setOver(null);
    },
  });

  return {
    rowProps,
    handleProps,
    moveUp: (id: string) => move(id, ids.indexOf(id) - 1),
    moveDown: (id: string) => move(id, ids.indexOf(id) + 1),
  };
}

/** sx for a row using rowProps: faded while dragged, a spruce line where it will land */
export const dragRowSx = {
  '&[data-dragging]': { opacity: 0.45 },
  '&[data-over]': { boxShadow: (t: { palette: { primary: { main: string } } }) => `inset 0 2px 0 ${t.palette.primary.main}` },
} as const;
