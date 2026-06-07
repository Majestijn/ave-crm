import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type { Contact } from "../../types/contacts";
import {
  formatDateNL,
  formatNetworkRoles,
  formatRevenueFullEuro,
} from "../../utils/formatters";
import { primaryButtonSx } from "./styles";

type Props = {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
};

/** Read-only label/value row; renders nothing when the value is empty. */
function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <Box display="flex" justifyContent="space-between" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{ textAlign: "right", wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** Chip list row; renders nothing when the array is empty. */
function ChipsRow({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {items.map((item) => (
          <Chip key={item} label={item} size="small" />
        ))}
      </Stack>
    </Box>
  );
}

/** Section heading shown above a group of rows. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      color="text.secondary"
      sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}
    >
      {children}
    </Typography>
  );
}

export default function ContactPersonDetailDialog({
  open,
  contact,
  onClose,
}: Props) {
  if (!contact) return null;

  const hasEmployment =
    contact.annual_salary_cents != null ||
    contact.hourly_rate_cents != null ||
    contact.vacation_days != null ||
    contact.bonus_percentage != null ||
    (contact.benefits?.length ?? 0) > 0 ||
    !!contact.education ||
    !!contact.availability_date;

  const workExperiences = contact.work_experiences ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        {contact.name ||
          `${contact.first_name} ${contact.last_name}`.trim() ||
          "Contactpersoon"}
        {contact.company_role && (
          <Typography variant="body2" color="text.secondary">
            {contact.company_role}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Contactgegevens */}
          <Stack spacing={1}>
            <SectionTitle>Contactgegevens</SectionTitle>
            <Row
              label="E-mail"
              value={
                contact.email && (
                  <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
                )
              }
            />
            <Row
              label="Telefoon"
              value={
                contact.phone && (
                  <Link href={`tel:${contact.phone}`}>{contact.phone}</Link>
                )
              }
            />
            <Row label="Locatie" value={contact.location} />
            <Row label="Huidig bedrijf" value={contact.current_company} />
            <Row
              label="LinkedIn"
              value={
                contact.linkedin_url && (
                  <Link
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Profiel openen
                  </Link>
                )
              }
            />
            <Row
              label="CV"
              value={
                contact.cv_url && (
                  <Link
                    href={contact.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CV openen
                  </Link>
                )
              }
            />
          </Stack>

          {/* Persoonlijk */}
          {(contact.date_of_birth || contact.gender) && (
            <>
              <Divider />
              <Stack spacing={1}>
                <SectionTitle>Persoonlijk</SectionTitle>
                <Row
                  label="Geboortedatum"
                  value={
                    contact.date_of_birth &&
                    formatDateNL(contact.date_of_birth)
                  }
                />
                <Row label="Geslacht" value={contact.gender} />
              </Stack>
            </>
          )}

          {/* Rollen & classificatie */}
          <Divider />
          <Stack spacing={1}>
            <SectionTitle>Rollen &amp; classificatie</SectionTitle>
            <Row
              label="Netwerkrollen"
              value={
                contact.network_roles?.length
                  ? formatNetworkRoles(contact.network_roles)
                  : undefined
              }
            />
            <Row label="Categorie" value={contact.category} />
            <Row label="Subcategorie" value={contact.secondary_category} />
            <ChipsRow
              label="Tertiaire categorie"
              items={contact.tertiary_category}
            />
            <ChipsRow label="Merken" items={contact.merken} />
            <ChipsRow label="Labels" items={contact.labels} />
          </Stack>

          {/* Arbeidsvoorwaarden */}
          {hasEmployment && (
            <>
              <Divider />
              <Stack spacing={1}>
                <SectionTitle>Arbeidsvoorwaarden</SectionTitle>
                <Row
                  label="Jaarsalaris"
                  value={
                    contact.annual_salary_cents != null
                      ? formatRevenueFullEuro(contact.annual_salary_cents)
                      : undefined
                  }
                />
                <Row
                  label="Uurtarief"
                  value={
                    contact.hourly_rate_cents != null
                      ? formatRevenueFullEuro(contact.hourly_rate_cents)
                      : undefined
                  }
                />
                <Row label="Vakantiedagen" value={contact.vacation_days} />
                <Row
                  label="Bonus"
                  value={
                    contact.bonus_percentage != null
                      ? `${contact.bonus_percentage}%`
                      : undefined
                  }
                />
                <ChipsRow label="Arbeidsvoorwaarden" items={contact.benefits} />
                <Row label="Opleiding" value={contact.education} />
                <Row
                  label="Beschikbaar vanaf"
                  value={
                    contact.availability_date &&
                    formatDateNL(contact.availability_date)
                  }
                />
              </Stack>
            </>
          )}

          {/* Werkervaring */}
          {workExperiences.length > 0 && (
            <>
              <Divider />
              <Stack spacing={1}>
                <SectionTitle>Werkervaring</SectionTitle>
                {workExperiences.map((we, idx) => (
                  <Box key={we.id ?? idx}>
                    <Typography variant="body2" fontWeight={500}>
                      {we.job_title} @ {we.company_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {we.start_date ? formatDateNL(we.start_date) : "?"} –{" "}
                      {we.end_date ? formatDateNL(we.end_date) : "heden"}
                      {we.location ? ` · ${we.location}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {/* Notities */}
          {contact.notes && (
            <>
              <Divider />
              <Stack spacing={1}>
                <SectionTitle>Notities</SectionTitle>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {contact.notes}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={primaryButtonSx}>
          Sluiten
        </Button>
      </DialogActions>
    </Dialog>
  );
}
