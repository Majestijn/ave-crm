/**
 * Shared styles for account components
 */

export const primaryButtonSx = {
  bgcolor: "#590d0d",
  "&:hover": { bgcolor: "#3d0909" },
} as const;

export const disabledButtonSx = {
  ...primaryButtonSx,
  "&:disabled": { bgcolor: "#ccc" },
} as const;

export const activityColors: Record<string, string> = {
  call: "#590d0d", // Dark red
  proposal: "#1976d2", // Blue
  interview: "#ed6c02", // Orange
  hired: "#2e7d32", // Green
  rejected: "#d32f2f", // Red
  personality_test: "#9c27b0", // Purple
  test: "#00acc1", // Cyan
  interview_training: "#f57c00", // Deep orange
};

export const getActivityColor = (type: string): string => {
  return activityColors[type] || activityColors.call;
};

