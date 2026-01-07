import { useCallback, useState, useEffect } from "react";
import API from "../../axios-client";
import type { Contact } from "../types/contacts";

export type CandidateAssignmentStatus =
    | "called"
    | "proposed"
    | "first_interview"
    | "second_interview"
    | "hired"
    | "rejected";

export type CandidateAssignment = {
    id: number; // Pivot ID or unique ID
    contact: Contact;
    status: CandidateAssignmentStatus;
    status_label: string;
};

export const useAssignmentCandidates = (assignmentUid?: string) => {
    const [candidates, setCandidates] = useState<CandidateAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!assignmentUid) {
            setCandidates([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await API.get<CandidateAssignment[]>(
                `/assignments/${assignmentUid}/candidates`
            );
            setCandidates(response);
        } catch (e: any) {
            console.error("Error fetching assignment candidates:", e);
            setError(e?.response?.data?.message || "Fout bij laden van kandidaten");
        } finally {
            setLoading(false);
        }
    }, [assignmentUid]);

    const addCandidates = async (contactUids: string[]) => {
        if (!assignmentUid) return;
        setLoading(true);
        try {
            await API.post(`/assignments/${assignmentUid}/candidates`, {
                contact_uids: contactUids
            });
            await refresh();
        } catch (e: any) {
            console.error("Error adding candidates:", e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (contactUid: string, status: CandidateAssignmentStatus) => {
        if (!assignmentUid) return;
        try {
            await API.put(`/assignments/${assignmentUid}/candidates/${contactUid}`, {
                status
            });
            // Optimistic update
            setCandidates(prev => prev.map(c =>
                c.contact.uid === contactUid
                    ? { ...c, status, status_label: getStatusLabel(status) }
                    : c
            ));
        } catch (e: any) {
            console.error("Error updating status:", e);
            throw e; // Re-throw to let UI handle error if needed
        }
    };

    const removeCandidate = async (contactUid: string) => {
        if (!assignmentUid) return;
        try {
            await API.delete(`/assignments/${assignmentUid}/candidates/${contactUid}`);
            setCandidates(prev => prev.filter(c => c.contact.uid !== contactUid));
        } catch (e: any) {
            console.error("Error removing candidate:", e);
            throw e;
        }
    };

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        candidates,
        loading,
        error,
        refresh,
        addCandidates,
        updateStatus,
        removeCandidate
    };
};

const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        called: 'Gebeld',
        proposed: 'Voorgesteld',
        first_interview: '1e gesprek',
        second_interview: '2e gesprek',
        hired: 'Aangenomen',
        rejected: 'Afgewezen',
    };
    return labels[status] || status;
};
