/**
 * Format a contact's full name from parts
 */
export const formatContactName = (contact: {
  name?: string;
  first_name?: string;
  prefix?: string;
  last_name?: string;
}): string =>
  contact.name ||
  [contact.first_name, contact.prefix, contact.last_name]
    .filter(Boolean)
    .join(" ");

/**
 * Format revenue in cents to a human-readable string
 */
export const formatRevenue = (revenueCents?: number): string => {
  if (!revenueCents) return "-";

  const millions = revenueCents / 1000000;
  const billions = revenueCents / 1000000000;

  if (billions >= 1) {
    return `${billions.toFixed(0)} mld`;
  } else if (millions >= 1) {
    return `${millions.toFixed(0)} mln`;
  } else {
    return `${(revenueCents / 1000).toFixed(0)} k`;
  }
};

/**
 * Format revenue in cents to full euro amount
 */
export const formatRevenueFullEuro = (revenueCents?: number): string => {
  if (!revenueCents) return "-";
  return `€${(revenueCents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })},-`;
};

/**
 * Network role labels mapping (full version)
 */
export const networkRoleLabels: Record<string, string> = {
  invoice_contact: "Factuurcontact",
  candidate: "Kandidaat",
  interim: "Interimmer",
  ambassador: "Ambassadeur",
  potential_management: "Potentieel Management",
  co_decision_maker: "Medebeslisser",
  potential_directie: "Potentieel Directie",
  candidate_reference: "Referentie van kandidaat",
  hr_employment: "HR arbeidsvoorwaarden",
  hr_recruiters: "HR recruiters",
  directie: "Directie",
  owner: "Eigenaar",
  expert: "Expert",
  coach: "Coach",
  former_owner: "Oud eigenaar",
  former_director: "Oud directeur",
  commissioner: "Commissaris",
  investor: "Investeerder",
  network_group: "Netwerkgroep",
};

/**
 * Network role labels mapping (short version for compact displays)
 */
export const networkRoleLabelsShort: Record<string, string> = {
  invoice_contact: "Factuurcontact",
  candidate: "Kandidaat",
  interim: "Interimmer",
  ambassador: "Ambassadeur",
  potential_management: "Pot. Management",
  co_decision_maker: "Medebeslisser",
  potential_directie: "Pot. Directie",
  candidate_reference: "Referentie",
  hr_employment: "HR arbeidsv.",
  hr_recruiters: "HR recruiters",
  directie: "Directie",
  owner: "Eigenaar",
  expert: "Expert",
  coach: "Coach",
  former_owner: "Oud eigenaar",
  former_director: "Oud directeur",
  commissioner: "Commissaris",
  investor: "Investeerder",
  network_group: "Netwerkgroep",
};

/**
 * Format network roles to human-readable string
 */
export const formatNetworkRoles = (roles?: string[], short = false): string => {
  if (!roles || roles.length === 0) return "";
  const labels = short ? networkRoleLabelsShort : networkRoleLabels;
  return roles.map((r) => labels[r] || r).join(", ");
};

/**
 * Format date string to Dutch locale
 */
export const formatDateNL = (date: string): string => {
  return new Date(date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Normalize date string (remove time portion if present)
 */
export const normalizeDate = (date: string): string => {
  if (typeof date === "string" && date.includes("T")) {
    return date.split("T")[0];
  }
  return date;
};

