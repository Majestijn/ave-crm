import API from "./client";

export type ExportKind = "contacts" | "accounts" | "assignments";

// Base filename per export; the backend also sets a Content-Disposition, but we
// set the download name client-side so it works regardless of header exposure.
const BASE_FILENAMES: Record<ExportKind, string> = {
  contacts: "netwerk-contacten",
  accounts: "klanten",
  assignments: "opdrachten",
};

/**
 * Fetch an XLSX export from the backend and trigger a browser download.
 */
export async function downloadExport(kind: ExportKind): Promise<void> {
  const blob = await API.get<Blob>(`/exports/${kind}`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${BASE_FILENAMES[kind]}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
