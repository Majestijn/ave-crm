import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  Fade,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import {
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import { useImportProgress } from "../../contexts/ImportProgressContext";

export default function ImportProgressIndicator() {
  const { progress, dismissProgress, minimizeProgress, maximizeProgress } = useImportProgress();
  const [showDetails, setShowDetails] = useState<"success" | "skipped" | "failed" | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const cachedStatusRef = useRef(progress.status);

  // Cache status when active so we can animate out with it
  if (progress.isActive && progress.status) {
    cachedStatusRef.current = progress.status;
  }

  const handleDismiss = () => {
    setIsExiting(true);
  };

  const handleExited = () => {
    cachedStatusRef.current = null as any;
    dismissProgress();
    setIsExiting(false);
  };

  // During exit animation, keep showing cached content; otherwise hide when inactive
  const isVisible = (progress.isActive || isExiting) && (progress.status || cachedStatusRef.current);

  if (!isVisible) {
    return null;
  }

  const { status, isMinimized } = progress;
  const displayStatus = status ?? cachedStatusRef.current;
  const progressPercent = displayStatus && displayStatus.total > 0 
    ? Math.round((displayStatus.processed / displayStatus.total) * 100) 
    : 0;
  
  // Determine header color: only error if there are actual failures
  const getHeaderColor = () => {
    if (!displayStatus?.is_complete) return "primary.main";
    if (displayStatus.failed_count > 0) return "error.main";
    return "success.main";
  };

  return (
    <Fade in={!isExiting} onExited={handleExited}>
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1400,
        minWidth: isMinimized ? 200 : 320,
        maxWidth: 400,
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      {/* Header - always visible */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: getHeaderColor(),
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => isMinimized ? maximizeProgress() : minimizeProgress()}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CloudUploadIcon fontSize="small" />
          <Typography variant="subtitle2">
            {displayStatus?.is_complete ? "Import Voltooid" : (progress.label || "CV Import...")}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            sx={{ color: "white" }}
            onClick={(e) => {
              e.stopPropagation();
              isMinimized ? maximizeProgress() : minimizeProgress();
            }}
          >
            {isMinimized ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
          {displayStatus?.is_complete && (
            <IconButton
              size="small"
              sx={{ color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Minimized view - just progress bar */}
      {isMinimized && !displayStatus?.is_complete && (
        <LinearProgress 
          variant="determinate" 
          value={progressPercent} 
          sx={{ height: 4 }}
        />
      )}

      {/* Expanded view */}
      <Collapse in={!isMinimized}>
        <Box sx={{ p: 2 }}>
          {!displayStatus?.is_complete && (
            <>
              <LinearProgress 
                variant="determinate" 
                value={progressPercent} 
                sx={{ mb: 1, height: 6, borderRadius: 1 }}
              />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {displayStatus.processed} van {displayStatus.total} verwerkt ({progressPercent}%)
              </Typography>
            </>
          )}

          {/* Clickable chips to show details */}
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mt: 1.5, gap: 0.5 }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={displayStatus.success_count}
              color="success"
              size="small"
              variant={showDetails === "success" ? "filled" : "outlined"}
              onClick={displayStatus.is_complete && displayStatus.success_count > 0 ? () => setShowDetails(showDetails === "success" ? null : "success") : undefined}
              sx={displayStatus.is_complete && displayStatus.success_count > 0 ? { cursor: "pointer" } : {}}
            />
            {(displayStatus.skipped_count ?? 0) > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={displayStatus.skipped_count}
                color="warning"
                size="small"
                variant={showDetails === "skipped" ? "filled" : "outlined"}
                onClick={displayStatus.is_complete ? () => setShowDetails(showDetails === "skipped" ? null : "skipped") : undefined}
                sx={displayStatus.is_complete ? { cursor: "pointer" } : {}}
              />
            )}
            {(displayStatus.failed_count ?? 0) > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={displayStatus.failed_count}
                color="error"
                size="small"
                variant={showDetails === "failed" ? "filled" : "outlined"}
                onClick={displayStatus.is_complete ? () => setShowDetails(showDetails === "failed" ? null : "failed") : undefined}
                sx={displayStatus.is_complete ? { cursor: "pointer" } : {}}
              />
            )}
          </Stack>

          {/* Detail lists - shown when chip is clicked */}
          {displayStatus?.is_complete && showDetails === "success" && (displayStatus.success?.length ?? 0) > 0 && (
            <Box sx={{ mt: 1.5, maxHeight: 150, overflow: "auto", border: 1, borderColor: "success.light", borderRadius: 1 }}>
              <List dense disablePadding>
                {(displayStatus.success ?? []).map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.name} 
                      secondary={item.filename}
                      primaryTypographyProps={{ variant: "caption" }}
                      secondaryTypographyProps={{ variant: "caption", sx: { fontSize: 10 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {displayStatus?.is_complete && showDetails === "skipped" && (displayStatus.skipped?.length ?? 0) > 0 && (
            <Box sx={{ mt: 1.5, maxHeight: 150, overflow: "auto", border: 1, borderColor: "warning.light", borderRadius: 1 }}>
              <List dense disablePadding>
                {(displayStatus.skipped ?? []).map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <WarningIcon color="warning" sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.filename} 
                      secondary={item.reason}
                      primaryTypographyProps={{ variant: "caption" }}
                      secondaryTypographyProps={{ variant: "caption", sx: { fontSize: 10 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {displayStatus?.is_complete && showDetails === "failed" && (displayStatus.failed?.length ?? 0) > 0 && (
            <Box sx={{ mt: 1.5, maxHeight: 150, overflow: "auto", border: 1, borderColor: "error.light", borderRadius: 1 }}>
              <List dense disablePadding>
                {(displayStatus.failed ?? []).map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ErrorIcon color="error" sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.filename} 
                      secondary={item.reason}
                      primaryTypographyProps={{ variant: "caption" }}
                      secondaryTypographyProps={{ variant: "caption", sx: { fontSize: 10 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Hint text when complete */}
          {displayStatus?.is_complete && !showDetails && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              display="block" 
              textAlign="center"
              sx={{ mt: 1 }}
            >
              Klik op een chip voor details
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
    </Fade>
  );
}
