import type { Assignment } from "../../../types/accounts";
import type { CandidateAssignment } from "../../../api/queries/assignments";

export type AssignmentWithDetails = Assignment & {
  uid?: string;
  account?: {
    uid: string;
    name: string;
  };
  recruiter?: {
    uid: string;
    name: string;
  } | null;
  secondary_recruiters?: {
    uid: string;
    name: string;
  }[];
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  vacation_days?: number;
  bonus_percentage?: number | null;
  start_date?: string;
  notes_image_url?: string | null;
  benefits?: string[];
  candidates?: CandidateAssignment[];
};

export const formatNumberInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("nl-NL");
};

export const parseFormattedNumber = (value: string): number | "" => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10);
};

export const benefitsOptions = [
  "Reiskostenvergoeding",
  "Pensioen",
  "Dienstreizen vergoeding",
  "Mogelijkheid tot promotie",
  "Flexibele werkuren",
  "Personeelskorting",
  "Bedrijfsfeesten",
  "Productkorting werknemers",
  "Auto van de zaak",
  "Budget voor professionele ontwikkeling",
  "Zorgverzekering",
  "Collectieve zorgverzekering",
  "Bedrijfsopleiding",
  "Vrijdagmiddagborrel",
  "Kerstpakket",
  "Extra vakantiedagen",
  "Fietsplan",
  "Bedrijfsfitness",
  "Winstdeling",
  "Werk vanuit huis",
  "Telefoon van de zaak",
  "Telefoonplan",
  "Aanvullend pensioen",
  "Gezondheidsprogramma",
  "Lunchkorting",
  "Kosteloos parkeren",
  "Levensverzekering",
  "Aandelenopties",
  "Taaltraining aangeboden",
  "Kinderopvang",
  "Verhuisvergoeding",
  "Huisvestingsvergoeding",
];

export const statusOptions = [
  { value: "active", label: "Actief" },
  { value: "proposed", label: "Voorgesteld" },
  { value: "hired", label: "Aangenomen" },
  { value: "shadow_management", label: "Shadow Management" },
  { value: "completed", label: "Voltooid" },
  { value: "cancelled", label: "Geannuleerd" },
];

export const candidateStatusOptions: {
  value: CandidateAssignment["status"];
  label: string;
}[] = [
  { value: "called", label: "Gebeld" },
  { value: "proposed", label: "Voorgesteld" },
  { value: "first_interview", label: "1e gesprek" },
  { value: "second_interview", label: "2e gesprek" },
  { value: "hired", label: "Aangenomen" },
  { value: "rejected", label: "Afgewezen" },
];

export const getStatusColor = (
  status: string,
): "inherit" | "primary" | "success" | "error" | "warning" => {
  switch (status) {
    case "hired":
    case "completed":
      return "success";
    case "cancelled":
    case "rejected":
      return "error";
    case "proposed":
      return "primary";
    default:
      return "inherit";
  }
};

export const getCandidateStatusColor = (
  status: CandidateAssignment["status"],
): string => {
  switch (status) {
    case "hired":
      return "#2e7d32";
    case "rejected":
      return "#d32f2f";
    case "first_interview":
    case "second_interview":
      return "#1976d2";
    case "proposed":
      return "#ed6c02";
    case "called":
    default:
      return "#2e7d32";
  }
};

export const CANDIDATES_COLUMN_ORDER_KEY =
  "ave-crm-assignment-candidates-column-order";

export const CANDIDATES_COLUMN_META = [
  { field: "name", headerName: "Naam" },
  { field: "email", headerName: "E-mail" },
  { field: "phone", headerName: "Telefoon" },
  { field: "company_role", headerName: "Functie" },
  { field: "current_company", headerName: "Bedrijf" },
  { field: "location", headerName: "Locatie" },
  { field: "date_of_birth", headerName: "Geboortedatum" },
  { field: "availability_date", headerName: "Beschikbaar" },
  { field: "network_roles", headerName: "Netwerk rollen" },
  { field: "status", headerName: "Status" },
  { field: "cv", headerName: "CV" },
  { field: "actions", headerName: "Acties" },
];

export const candidateNetworkRoleLabels: Record<
  string,
  { label: string; color: "default" | "success" | "error" | "warning" | "info" }
> = {
  candidate: { label: "Kandidaat", color: "info" },
  candidate_placed: { label: "Geplaatst", color: "success" },
  candidate_rejected: { label: "Afgewezen", color: "error" },
  interim: { label: "Interimmer", color: "warning" },
  ambassador: { label: "Ambassadeur", color: "default" },
  budget_holder: { label: "Budgethouder", color: "default" },
  client_principal: { label: "Opdrachtgever", color: "info" },
  signing_authority: { label: "Tekenbevoegd", color: "warning" },
  final_decision_maker: { label: "Eindbeslisser", color: "success" },
};
