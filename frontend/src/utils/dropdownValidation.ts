import type { DropdownOption } from "../api/queries/dropdownOptions";

/**
 * Allowed values for client-side validation, aligned with backend
 * `DropdownOption::validValues()` (active options only, else fallback list).
 */
export function buildAllowedValueSet(
  dbOptions: { is_active: boolean; value: string }[] | undefined,
  fallbackValues: readonly string[]
): Set<string> {
  if (dbOptions) {
    const active = dbOptions
      .filter((o) => o.is_active)
      .map((o) => o.value);
    if (active.length > 0) return new Set(active);
  }
  return new Set(fallbackValues);
}

/** Only active options from the API. Empty while loading (`undefined`) or when none are active. */
export function activeDropdownLabeled(
  data: DropdownOption[] | undefined
): { value: string; label: string }[] {
  if (data === undefined) return [];
  return data
    .filter((o) => o.is_active)
    .map((o) => ({ value: o.value, label: o.label }));
}

/** Only active values from the API (chips, simple selects). */
export function activeDropdownValues(data: DropdownOption[] | undefined): string[] {
  if (data === undefined) return [];
  return data.filter((o) => o.is_active).map((o) => o.value);
}

/** Client status / colored selects: active options with resolved swatch. */
export function activeDropdownLabeledWithColor(
  data: DropdownOption[] | undefined
): { value: string; label: string; color: string }[] {
  if (data === undefined) return [];
  return data
    .filter((o) => o.is_active)
    .map((o) => ({
      value: o.value,
      label: o.label,
      color: o.color || "#BDBDBD",
    }));
}
