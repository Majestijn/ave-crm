<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Contact;
use Illuminate\Http\Request;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    /** Roles allowed to export full datasets (an admin/settings action). */
    private const EXPORT_ROLES = ['owner', 'admin', 'management'];

    /**
     * Export all network contacts as an XLSX file (one row per contact).
     */
    public function contacts(Request $request): BinaryFileResponse
    {
        $this->authorizeExport($request);

        $contacts = Contact::with('workExperiences')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $header = [
            'Voornaam', 'Tussenvoegsel', 'Achternaam', 'Geboortedatum', 'Geslacht',
            'E-mail', 'Telefoon', 'Locatie', 'Huidig bedrijf', 'Functie',
            'Categorie', 'Subcategorie', 'Tertiaire categorie', 'Merken', 'Labels',
            'Netwerkrollen', 'Jaarsalaris (€)', 'Uurtarief (€)', 'Vakantiedagen',
            'Bonus (%)', 'Arbeidsvoorwaarden', 'Opleiding', 'Beschikbaarheidsdatum',
            'LinkedIn', 'Werkervaring', 'Notities',
        ];

        $rows = $contacts->map(fn (Contact $c) => [
            $c->first_name,
            $c->prefix,
            $c->last_name,
            $this->date($c->date_of_birth),
            $c->gender,
            $c->email,
            $c->phone,
            $c->location,
            $c->current_company,
            $c->company_role,
            $c->category,
            $c->secondary_category,
            $this->list($c->tertiary_category),
            $this->list($c->merken),
            $this->list($c->labels),
            $this->list($c->network_roles),
            $this->euros($c->annual_salary_cents),
            $this->euros($c->hourly_rate_cents),
            $c->vacation_days,
            $c->bonus_percentage,
            $this->list($c->benefits),
            $c->education,
            $this->date($c->availability_date),
            $c->linkedin_url,
            $this->workExperienceSummary($c),
            $c->notes,
        ]);

        return $this->streamXlsx('netwerk-contacten', $header, $rows);
    }

    /**
     * Export all accounts (clients) as an XLSX file (one row per account).
     */
    public function accounts(Request $request): BinaryFileResponse
    {
        $this->authorizeExport($request);

        $accounts = Account::withCount('assignments')
            ->orderBy('name')
            ->get();

        $header = [
            'Naam', 'Moederbedrijf', 'Locatie', 'Website', 'Telefoon', 'Branche',
            'Categorie', 'Subcategorie', 'Tertiaire categorie', 'Merken', 'Labels',
            'Aantal FTE', 'Omzet (€)', 'Klantstatus', 'Salesdoelen', 'Aantal opdrachten',
            'Notities',
        ];

        $rows = $accounts->map(fn (Account $a) => [
            $a->name,
            $a->parent_company,
            $a->location,
            $a->website,
            $a->phone,
            $a->industry,
            $a->category,
            $a->secondary_category,
            $this->list($a->tertiary_category),
            $this->list($a->merken),
            $this->list($a->labels),
            $a->fte_count,
            $this->euros($a->revenue_cents),
            $a->client_status,
            $this->list($a->sales_target),
            $a->assignments_count,
            $a->notes,
        ]);

        return $this->streamXlsx('klanten', $header, $rows);
    }

    /**
     * Export all assignments as an XLSX file (one row per assignment).
     */
    public function assignments(Request $request): BinaryFileResponse
    {
        $this->authorizeExport($request);

        $assignments = Assignment::with(['account', 'recruiter'])
            ->withCount('candidates')
            ->orderBy('title')
            ->get();

        $header = [
            'Titel', 'Klant', 'Recruiter', 'Status', 'Salaris min (€)', 'Salaris max (€)',
            'Vakantiedagen', 'Bonus (%)', 'Totale fee (€)', 'Voorschot fee (€)', 'Locatie',
            'Dienstverband', 'Uren/week min', 'Uren/week max', 'Startdatum', 'Einddatum',
            'Arbeidsvoorwaarden', 'Aantal kandidaten', 'Beschrijving',
        ];

        $rows = $assignments->map(fn (Assignment $a) => [
            $a->title,
            $a->account?->name,
            $a->recruiter?->name,
            $a->status,
            $a->salary_min,
            $a->salary_max,
            $a->vacation_days,
            $a->bonus_percentage,
            $a->total_fee,
            $a->advance_fee,
            $a->location,
            $a->employment_type,
            $a->hours_per_week_min,
            $a->hours_per_week_max,
            $this->date($a->start_date),
            $this->date($a->end_date),
            $this->list($a->benefits),
            $a->candidates_count,
            $a->description,
        ]);

        return $this->streamXlsx('opdrachten', $header, $rows);
    }

    /**
     * Only owner/admin/management may export full datasets.
     */
    private function authorizeExport(Request $request): void
    {
        if (! in_array($request->user()->role, self::EXPORT_ROLES, true)) {
            abort(403, 'Je hebt geen toestemming om data te exporteren.');
        }
    }

    /**
     * Write the header + rows to a temporary XLSX file and return it as a
     * download that is deleted after sending. OpenSpout's XLSX writer needs a
     * real (seekable) file because the final container is a zip archive, so we
     * cannot stream straight to php://output.
     *
     * @param  \Illuminate\Support\Collection<int, array<int, mixed>>  $rows
     */
    private function streamXlsx(string $baseName, array $header, $rows): BinaryFileResponse
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'export_') . '.xlsx';

        $writer = new Writer();
        $writer->openToFile($tmpPath);
        $writer->addRow(Row::fromValues($header));
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues(array_map(
                fn ($value) => $value ?? '',
                $row
            )));
        }
        $writer->close();

        $filename = $baseName . '-' . now()->format('Y-m-d') . '.xlsx';

        return response()
            ->download($tmpPath, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    /** Join an array column into a single readable cell. */
    private function list(?array $values): string
    {
        return $values ? implode('; ', $values) : '';
    }

    /** Format a (Carbon) date column as YYYY-MM-DD. */
    private function date($value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return (string) ($value ?? '');
    }

    /** Convert a cents amount to euros (float), or null when empty. */
    private function euros(?int $cents): ?float
    {
        return $cents === null ? null : round($cents / 100, 2);
    }

    /** One-line summary of a contact's work experiences. */
    private function workExperienceSummary(Contact $contact): string
    {
        return $contact->workExperiences
            ->map(function ($we) {
                $period = trim(
                    $this->date($we->start_date) . ' – ' . ($we->end_date ? $this->date($we->end_date) : 'heden')
                );

                return trim("{$we->job_title} @ {$we->company_name} ({$period})");
            })
            ->implode(' | ');
    }
}
