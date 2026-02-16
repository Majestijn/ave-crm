import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API from "../api/client";
import { queryKeys } from "../api/queries/keys";

interface FailedImport {
  filename: string;
  reason: string;
}

interface SkippedImport {
  filename: string;
  reason: string;
}

interface SuccessImport {
  filename: string;
  contact_id: number;
  contact_uid: string;
  name: string;
}

type ImportType = "smart" | "batch";

interface BatchStatus {
  batch_id: string;
  total: number;
  processed: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  is_complete: boolean;
  success: SuccessImport[];
  failed: FailedImport[];
  skipped: SkippedImport[];
}

// Batch import has different field names
interface VertexBatchStatus {
  batch_id: string;
  status: string;
  total_files: number;
  extracted_files: number;
  processed_files: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  progress_percentage: number;
  is_complete: boolean;
  error_message: string | null;
  failed_files: FailedImport[];
  skipped_files: SkippedImport[];
}

interface ImportProgress {
  batchId: string | null;
  importType: ImportType | null;
  status: BatchStatus | null;
  isActive: boolean;
  isMinimized: boolean;
  label?: string; // Display label for the import type
}

interface ImportProgressContextType {
  progress: ImportProgress;
  startImport: (batchId: string, totalFiles: number) => void;
  startBatchImport: (batchId: string, totalFiles: number) => void;
  updateStatus: (status: BatchStatus) => void;
  completeImport: () => void;
  dismissProgress: () => void;
  minimizeProgress: () => void;
  maximizeProgress: () => void;
}

const ImportProgressContext = createContext<ImportProgressContextType | null>(null);

const SMART_POLL_INTERVAL = 2000;
const BATCH_POLL_INTERVAL = 5000;

export function ImportProgressProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const STORAGE_KEY = 'AVE_CRM_IMPORT_PROGRESS';

  const [progress, setProgress] = useState<ImportProgress>(() => {
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse stored import progress", e);
    }

    return {
      batchId: null,
      importType: null,
      status: null,
      isActive: false,
      isMinimized: false,
    };
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRefetchedRef = useRef(false);
  const importTypeRef = useRef<ImportType | null>(null);
  const hasResumedRef = useRef(false);

  // Persist state changes
  useEffect(() => {
    if (progress.isActive) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [progress]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll for Smart Import status
  const pollSmartStatus = useCallback(async (batchId: string) => {
    try {
      const status = await API.get<BatchStatus>(`/contacts/smart-import/${batchId}`);
      setProgress((prev) => ({
        ...prev,
        status,
      }));

      if (status.is_complete) {
        stopPolling();
        // Clear storage on completion, but keep state active so user sees result
        localStorage.removeItem(STORAGE_KEY);

        if (!hasRefetchedRef.current && status.success_count > 0) {
          hasRefetchedRef.current = true;
          queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.contacts.candidates });
        }
      }
    } catch (err) {
      console.error("Error polling smart import status:", err);
    }
  }, [stopPolling, queryClient]);

  // Poll for Batch/Vertex Import status
  const pollBatchStatus = useCallback(async (batchId: string) => {
    try {
      const vertexStatus = await API.get<VertexBatchStatus>(`/cv-import/batch/${batchId}`);

      // Convert to common BatchStatus format
      const status: BatchStatus = {
        batch_id: vertexStatus.batch_id,
        total: vertexStatus.total_files,
        processed: vertexStatus.processed_files,
        success_count: vertexStatus.success_count,
        failed_count: vertexStatus.failed_count,
        skipped_count: vertexStatus.skipped_count ?? 0,
        is_complete: vertexStatus.is_complete,
        success: [], // Batch import doesn't return individual success items
        failed: vertexStatus.failed_files ?? [],
        skipped: vertexStatus.skipped_files ?? [],
      };

      setProgress((prev) => ({
        ...prev,
        status,
      }));

      if (status.is_complete) {
        stopPolling();
        localStorage.removeItem(STORAGE_KEY);

        if (!hasRefetchedRef.current && status.success_count > 0) {
          hasRefetchedRef.current = true;
          queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.contacts.candidates });
        }
      }
    } catch (err) {
      console.error("Error polling batch import status:", err);
    }
  }, [stopPolling, queryClient]);

  const startSmartPolling = useCallback((batchId: string) => {
    stopPolling();
    importTypeRef.current = "smart";
    pollSmartStatus(batchId);
    pollIntervalRef.current = setInterval(() => pollSmartStatus(batchId), SMART_POLL_INTERVAL);
  }, [pollSmartStatus, stopPolling]);

  const startBatchPolling = useCallback((batchId: string) => {
    stopPolling();
    importTypeRef.current = "batch";
    pollBatchStatus(batchId);
    pollIntervalRef.current = setInterval(() => pollBatchStatus(batchId), BATCH_POLL_INTERVAL);
  }, [pollBatchStatus, stopPolling]);

  // Resume polling on mount if active
  useEffect(() => {
    if (!hasResumedRef.current && progress.isActive && progress.batchId) {
      hasResumedRef.current = true;
      if (progress.importType === 'smart') {
        startSmartPolling(progress.batchId);
      } else if (progress.importType === 'batch') {
        startBatchPolling(progress.batchId);
      }
    }
  }, [progress.isActive, progress.batchId, progress.importType, startSmartPolling, startBatchPolling]);

  // Start Smart Import (individual CVs)
  const startImport = useCallback((batchId: string, totalFiles: number) => {
    hasRefetchedRef.current = false;
    setProgress({
      batchId,
      importType: "smart",
      status: {
        batch_id: batchId,
        total: totalFiles,
        processed: 0,
        success_count: 0,
        failed_count: 0,
        skipped_count: 0,
        is_complete: false,
        success: [],
        failed: [],
        skipped: [],
      },
      isActive: true,
      isMinimized: false,
      label: "Smart CV Import",
    });
    startSmartPolling(batchId);
  }, [startSmartPolling]);

  // Start Batch Import (ZIP file via Vertex AI)
  const startBatchImport = useCallback((batchId: string, totalFiles: number) => {
    hasRefetchedRef.current = false;
    setProgress({
      batchId,
      importType: "batch",
      status: {
        batch_id: batchId,
        total: totalFiles,
        processed: 0,
        success_count: 0,
        failed_count: 0,
        skipped_count: 0,
        is_complete: false,
        success: [],
        failed: [],
        skipped: [],
      },
      isActive: true,
      isMinimized: false,
      label: "Bulk CV Import",
    });
    startBatchPolling(batchId);
  }, [startBatchPolling]);

  const updateStatus = useCallback((status: BatchStatus) => {
    // We don't manually set progress here often, usually polling does it
    // But if we do, make sure we keep existing context
    setProgress((prev) => ({
      ...prev,
      status,
    }));
  }, []);

  const completeImport = useCallback(() => {
    stopPolling();
    localStorage.removeItem(STORAGE_KEY);
  }, [stopPolling]);

  const dismissProgress = useCallback(() => {
    stopPolling();
    localStorage.removeItem(STORAGE_KEY);
    setProgress({
      batchId: null,
      importType: null,
      status: null,
      isActive: false,
      isMinimized: false,
    });
  }, [stopPolling]);

  const minimizeProgress = useCallback(() => {
    setProgress((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const maximizeProgress = useCallback(() => {
    setProgress((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <ImportProgressContext.Provider
      value={{
        progress,
        startImport,
        startBatchImport,
        updateStatus,
        completeImport,
        dismissProgress,
        minimizeProgress,
        maximizeProgress,
      }}
    >
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext);
  if (!context) {
    throw new Error("useImportProgress must be used within ImportProgressProvider");
  }
  return context;
}
