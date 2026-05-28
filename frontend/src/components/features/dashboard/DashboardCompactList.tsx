import React, { useState } from "react";
import { Box, Button, Collapse, List } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const DEFAULT_PREVIEW = 4;

type DashboardCompactListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  previewCount?: number;
};

export default function DashboardCompactList<T>({
  items,
  getKey,
  renderItem,
  previewCount = DEFAULT_PREVIEW,
}: DashboardCompactListProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > previewCount;
  const preview = items.slice(0, previewCount);
  const rest = items.slice(previewCount);

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <List disablePadding dense sx={{ py: 0, flex: 1 }}>
        {preview.map((item) => (
          <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
        ))}
      </List>

      {hasMore && (
        <>
          <Collapse in={expanded} unmountOnExit>
            <List disablePadding dense sx={{ py: 0 }}>
              {rest.map((item) => (
                <React.Fragment key={getKey(item)}>
                  {renderItem(item)}
                </React.Fragment>
              ))}
            </List>
          </Collapse>
          <Button
            size="small"
            color="inherit"
            fullWidth
            onClick={() => setExpanded((v) => !v)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              mt: "auto",
              py: 0.5,
              minHeight: 32,
              fontSize: "0.75rem",
              color: "text.secondary",
              borderTop: "1px solid",
              borderColor: "divider",
              borderRadius: 0,
              flexShrink: 0,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            {expanded
              ? "Minder tonen"
              : `Toon alle ${items.length} (${items.length - previewCount} meer)`}
          </Button>
        </>
      )}
    </Box>
  );
}
