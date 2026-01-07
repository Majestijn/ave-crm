import React, { useEffect } from "react";
import { useAssignmentCandidates } from "../../hooks/useAssignmentCandidates";
import AssignmentCandidatesTable from "./AssignmentCandidatesTable";
import type { Contact } from "../../types/contacts";
import { Box, CircularProgress, Typography } from "@mui/material";

type AssignmentCandidatesContainerProps = {
    assignmentUid: string;
    assignmentDatabaseId: number;
    availableCandidates: Contact[];
};

export default function AssignmentCandidatesContainer({
    assignmentUid,
    assignmentDatabaseId, // Passed to table if needed, though table takes ID?
    availableCandidates,
}: AssignmentCandidatesContainerProps) {
    const {
        candidates,
        loading,
        refresh,
        addCandidates,
        updateStatus,
        removeCandidate,
    } = useAssignmentCandidates(assignmentUid);

    useEffect(() => {
        // Optional: polling or refresh when expanded? 
        // Hook auto-refreshes on mount.
    }, []);

    const handleAddCandidates = async (
        _assignmentId: number, // Legacy param from table
        candidateUids: string[]
    ) => {
        await addCandidates(candidateUids);
    };

    const handleRemoveCandidate = async (
        _assignmentId: number,
        candidateId: number
    ) => {
        // candidateId here comes from the table row, which is the PIVOT ID or whatever `id` we passed.
        // `useAssignmentCandidates` `removeCandidate` expects `contactUid`.
        // We need to find the contact UID from the list.
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate) {
            await removeCandidate(candidate.contact.uid);
        }
    };

    const handleStatusChange = async (
        _assignmentId: number,
        candidateId: number,
        newStatus: string
    ) => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate) {
            await updateStatus(candidate.contact.uid, newStatus as any);
        }
    };

    if (loading && candidates.length === 0) {
        return (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <AssignmentCandidatesTable
            assignmentId={assignmentDatabaseId}
            candidates={candidates}
            availableCandidates={availableCandidates}
            onAddCandidates={handleAddCandidates}
            onRemoveCandidate={handleRemoveCandidate}
            onStatusChange={handleStatusChange}
            loading={loading}
        />
    );
}
