import React from "react";
import { Paper, FormControl, Select, MenuItem } from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import type { AssignmentFromAPI } from "../../api/queries/assignments";

type Props = {
  assignments: AssignmentFromAPI[];
  selectedAssignment: string;
  onSelect: (uid: string) => void;
};

export default function AssignmentSelector({
  assignments,
  selectedAssignment,
  onSelect,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        borderRadius: 2,
        display: "inline-flex",
        alignItems: "center",
        minWidth: 300,
      }}
    >
      <AssignmentIcon sx={{ ml: 2, mr: 1, color: "text.primary" }} />
      <FormControl variant="standard" sx={{ minWidth: 200 }}>
        <Select
          value={selectedAssignment}
          onChange={(e) => onSelect(e.target.value as string)}
          disableUnderline
          displayEmpty
          sx={{ fontWeight: 600 }}
        >
          {assignments.length === 0 ? (
            <MenuItem value="" disabled>
              Geen opdrachten
            </MenuItem>
          ) : (
            assignments.map((assignment) => (
              <MenuItem key={assignment.uid} value={assignment.uid}>
                {assignment.title}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Paper>
  );
}

