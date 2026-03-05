import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  IconButton,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableColumnItem({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        mb: 0.5,
        bgcolor: "background.paper",
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    >
      <DragIndicatorIcon
        sx={{ mr: 1, color: "action.disabled", flexShrink: 0 }}
      />
      <Typography variant="body2">{label}</Typography>
    </ListItem>
  );
}

export type ColumnMeta = { field: string; headerName: string };

type ColumnOrderDialogProps = {
  open: boolean;
  onClose: () => void;
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  columnMeta: ColumnMeta[];
};

export function ColumnOrderDialog({
  open,
  onClose,
  columnOrder,
  onColumnOrderChange,
  columnMeta,
}: ColumnOrderDialogProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
      }
    }
  };

  const metaByField = Object.fromEntries(
    columnMeta.map((c) => [c.field, c.headerName])
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Kolomvolgorde</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sleep de kolommen om de volgorde aan te passen.
        </Typography>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columnOrder}
            strategy={verticalListSortingStrategy}
          >
            <List disablePadding>
              {columnOrder.map((field) => (
                <SortableColumnItem
                  key={field}
                  id={field}
                  label={metaByField[field] ?? field}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Sluiten</Button>
      </DialogActions>
    </Dialog>
  );
}
