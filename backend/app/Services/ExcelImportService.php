<?php

namespace App\Services;

use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\CSV\Options as CsvOptions;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

class ExcelImportService
{
    /** Dutch name prefixes (longer ones first for matching) */
    private const NAME_PREFIXES = ['van de', 'van den', 'van der', 'van het', 'van', 'de', 'den', 'der', 'ter', 'ten'];

    /** Supported column header variants (case-insensitive) mapped to Contact field. AssistentManager.xlsx format. */
    private const COLUMN_MAP = [
        'full_name' => ['naam', 'name', 'full name', 'volledige naam', 'contact'],
        'first_name' => ['voornaam', 'first name', 'first_name'],
        'last_name' => ['achternaam', 'last name', 'last_name'],
        'prefix' => ['tussenvoegsel', 'prefix', 'voorvoegsel'],
        'email' => ['email', 'e-mail', 'e-mailadres', 'mail'],
        'phone' => ['telefoon', 'phone', 'mobiel', 'mobiele nummer'],
        'location' => ['locatie', 'location', 'woonplaats', 'plaats', 'stad', 'omgeving'],
        'current_company' => ['bedrijf', 'company', 'current_company', 'werkgever', 'organisatie'],
        'company_role' => ['functie', 'role', 'company_role', 'titel', 'job title', 'functietitel'],
        'education' => ['opleiding', 'education', 'opleidingsniveau'],
        'date_of_birth' => ['geboortedatum', 'date of birth', 'date_of_birth', 'dob'],
        'age' => ['leeftijd', 'age'],
        'gender' => ['geslacht', 'gender', 'sex'],
        'linkedin_url' => ['linkedin', 'linkedin_url', 'linkedin url'],
        'status' => ['status'],
        'category' => ['categorie', 'category'],
        'notes' => ['notities', 'notes', 'opmerkingen', 'remarks'],
    ];

    /**
     * Import contacts from an Excel or CSV file.
     * Duplicates (same first+last name) are skipped, not updated.
     *
     * @return array{success_count: int, success: array, failed: array, skipped: array}
     */
    public function import(string $filePath, string $originalFilename): array
    {
        $reader = $this->createReader($filePath, $originalFilename);
        if (!$reader) {
            return [
                'success_count' => 0,
                'success' => [],
                'failed' => [['row' => 0, 'reason' => 'Bestandsformaat niet ondersteund. Gebruik .xlsx of .csv.']],
                'skipped' => [],
            ];
        }

        $reader->open($filePath);

        try {
            $headerMap = null;
            $rowIndex = 0;
            $success = [];
            $failed = [];
            $skipped = [];

            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $row) {
                    $rowIndex++;
                    $values = $this->rowToValues($row);

                    if ($rowIndex === 1) {
                        $headerMap = $this->parseHeaderMap($values);
                        if (empty($headerMap) || !$this->hasRequiredColumns($headerMap)) {
                            $failed[] = ['row' => $rowIndex, 'reason' => 'Geen herkenbare kolommen. Minimaal kolom "Naam" OF kolommen "Voornaam" en "Achternaam" vereist.'];
                        }
                        continue;
                    }

                    if (!$headerMap || !$this->hasRequiredColumns($headerMap)) {
                        continue;
                    }

                    $data = $this->mapRowToContactData($values, $headerMap);

                    if (empty($data['first_name']) || empty($data['last_name'])) {
                        $name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
                        $skipped[] = ['row' => $rowIndex, 'reason' => 'Ontbrekende naam', 'name' => $name ?: 'Rij ' . $rowIndex];
                        continue;
                    }

                    try {
                        $result = $this->upsertContact($data);
                        $name = implode(' ', array_filter([
                            $data['first_name'] ?? '',
                            $data['prefix'] ?? '',
                            $data['last_name'] ?? '',
                        ]));
                        $name = preg_replace('/\s+/', ' ', trim($name));

                        if ($result['duplicate']) {
                            $skipped[] = ['row' => $rowIndex, 'reason' => 'Duplicaat (bestaand contact)', 'name' => $name];
                        } else {
                            $success[] = ['row' => $rowIndex, 'name' => $name];
                        }
                    } catch (\Exception $e) {
                        Log::warning('Excel import row failed', ['row' => $rowIndex, 'error' => $e->getMessage()]);
                        $failed[] = [
                            'row' => $rowIndex,
                            'reason' => $e->getMessage(),
                            'name' => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                        ];
                    }
                }
                break; // Only first sheet
            }

            return [
                'success_count' => count($success),
                'success' => $success,
                'failed' => $failed,
                'skipped' => $skipped,
            ];
        } finally {
            $reader->close();
        }
    }

    private function createReader(string $filePath, string $filename): CsvReader|XlsxReader|null
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return match ($ext) {
            'xlsx' => new XlsxReader(),
            'csv' => new CsvReader(new CsvOptions()),
            default => null,
        };
    }

    private function rowToValues(Row $row): array
    {
        $arr = $row->toArray();
        $result = [];
        foreach ($arr as $idx => $val) {
            $result[$idx] = $val instanceof \DateTimeInterface
                ? $val->format('Y-m-d')
                : (is_scalar($val) ? trim((string) $val) : '');
        }
        return $result;
    }

    /** @return array<int, string> Column index => Contact field name */
    private function parseHeaderMap(array $headerValues): array
    {
        $map = [];
        foreach ($headerValues as $colIndex => $header) {
            $normalized = mb_strtolower(trim((string) $header));
            if ($normalized === '') {
                continue;
            }
            foreach (self::COLUMN_MAP as $field => $variants) {
                if (in_array($normalized, $variants, true)) {
                    $map[$colIndex] = $field;
                    break;
                }
            }
        }
        return $map;
    }

    private function hasRequiredColumns(array $headerMap): bool
    {
        $values = array_values($headerMap);
        $hasName = in_array('first_name', $values, true) && in_array('last_name', $values, true);
        $hasFullName = in_array('full_name', $values, true);
        return $hasName || $hasFullName;
    }

    private function mapRowToContactData(array $values, array $headerMap): array
    {
        $data = [];
        foreach ($headerMap as $colIndex => $field) {
            $val = $values[$colIndex] ?? '';
            if ($val !== '') {
                $data[$field] = $val;
            }
        }

        // Split full_name into first_name, prefix, last_name if we have it
        if (!empty($data['full_name']) && (empty($data['first_name']) || empty($data['last_name']))) {
            $parsed = $this->parseFullName($data['full_name']);
            $data['first_name'] = $parsed['first_name'] ?? $data['first_name'] ?? null;
            $data['prefix'] = $parsed['prefix'] ?? $data['prefix'] ?? null;
            $data['last_name'] = $parsed['last_name'] ?? $data['last_name'] ?? null;
        }
        unset($data['full_name']);

        if (isset($data['education'])) {
            $data['education'] = $this->normalizeEducation($data['education']);
        }
        if (isset($data['date_of_birth'])) {
            $data['date_of_birth'] = $this->parseDate($data['date_of_birth']);
        }
        if (isset($data['age']) && empty($data['date_of_birth'])) {
            $data['date_of_birth'] = $this->ageToApproximateDob($data['age']);
        }
        unset($data['age']);

        if (isset($data['prefix'])) {
            $data['prefix'] = mb_strtolower($data['prefix']);
        }
        if (isset($data['status']) || isset($data['category'])) {
            $parts = array_filter([
                isset($data['status']) ? "Status: {$data['status']}" : null,
                isset($data['category']) ? "Categorie: {$data['category']}" : null,
            ]);
            $data['notes'] = implode('. ', array_merge($parts, isset($data['notes']) ? [$data['notes']] : []));
        }
        unset($data['status'], $data['category']);
        return $data;
    }

    private function normalizeGender(?string $gender): ?string
    {
        if (!$gender) return null;
        $g = mb_strtoupper(trim($gender));
        return match ($g) {
            'M', 'MAN', 'MALE' => 'M',
            'V', 'VROUW', 'F', 'FEMALE' => 'V',
            default => $gender,
        };
    }

    private function normalizeLinkedInUrl(?string $value): ?string
    {
        if (!$value) return null;
        $v = trim($value);
        if (empty($v) || in_array(mb_strtolower($v), ['linkedin', 'linkedin url'], true)) {
            return null;
        }
        if (!str_starts_with(mb_strtolower($v), 'http')) {
            $v = 'https://www.linkedin.com/in/' . ltrim($v, '/');
        }
        return $v;
    }

    private function ageToApproximateDob(string|int $age): ?string
    {
        $ageInt = is_numeric($age) ? (int) $age : null;
        if ($ageInt === null || $ageInt < 1 || $ageInt > 120) {
            return null;
        }
        return now()->subYears($ageInt)->format('Y-m-d');
    }

    /**
     * Split full name into first_name, prefix, last_name (handles Dutch names like "Jan van der Berg").
     */
    private function parseFullName(string $fullName): array
    {
        $parts = preg_split('/\s+/u', trim($fullName), -1, PREG_SPLIT_NO_EMPTY);
        if (empty($parts)) {
            return ['first_name' => null, 'prefix' => null, 'last_name' => null];
        }
        if (count($parts) === 1) {
            return ['first_name' => $parts[0], 'prefix' => null, 'last_name' => $parts[0]];
        }

        $firstName = array_shift($parts);
        $prefix = null;
        $lastName = null;

        foreach (self::NAME_PREFIXES as $candidate) {
            $lower = mb_strtolower($candidate);
            $remaining = array_map('mb_strtolower', $parts);
            $combined = implode(' ', $remaining);

            if (str_starts_with($combined, $lower . ' ') || $combined === $lower) {
                $prefix = $candidate;
                $consume = count(explode(' ', $candidate));
                $lastParts = array_slice($parts, $consume);
                $lastName = implode(' ', $lastParts);
                break;
            }
        }

        if ($lastName === null) {
            $lastName = implode(' ', $parts);
        }
        if (trim($lastName ?? '') === '' && $prefix) {
            $lastName = $prefix;
            $prefix = null;
        }

        return [
            'first_name' => $this->normalizeName($firstName),
            'prefix' => $prefix ? mb_strtolower($prefix) : null,
            'last_name' => $this->normalizeName($lastName ?? ''),
        ];
    }

    private function normalizeEducation(?string $education): ?string
    {
        if (!$education) return null;
        $education = strtoupper(trim($education));
        if (in_array($education, ['MBO', 'HBO', 'UNI'])) {
            return $education;
        }
        $mapping = ['UNIVERSITEIT' => 'UNI', 'UNIVERSITY' => 'UNI', 'WO' => 'UNI', 'MASTER' => 'UNI', 'BACHELOR' => 'HBO', 'HOGESCHOOL' => 'HBO', 'MMO' => 'MBO'];
        return $mapping[$education] ?? null;
    }

    private function parseDate(string $value): ?string
    {
        if (empty($value)) return null;
        try {
            $parsed = Carbon::parse($value);
            return $parsed->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }

    private function normalizeName(string $name): string
    {
        $name = trim($name);
        if (mb_strtoupper($name) === $name || mb_strtolower($name) === $name) {
            $parts = explode('-', $name);
            $parts = array_map(fn ($p) => mb_convert_case($p, MB_CASE_TITLE, 'UTF-8'), $parts);
            return implode('-', $parts);
        }
        return $name;
    }

    /**
     * Create contact if not duplicate. Duplicates are skipped (not updated).
     *
     * @return array{contact: Contact, duplicate: bool}
     */
    private function upsertContact(array $data): array
    {
        $firstName = $this->normalizeName($data['first_name']);
        $lastName = $this->normalizeName($data['last_name']);

        $existing = Contact::whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower(trim($firstName))])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower(trim($lastName))])
            ->first();

        if ($existing) {
            return ['contact' => $existing, 'duplicate' => true];
        }

        $contactData = [
            'first_name' => $firstName,
            'prefix' => $data['prefix'] ?? null,
            'last_name' => $lastName,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender' => $this->normalizeGender($data['gender'] ?? null),
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'location' => $data['location'] ?? null,
            'current_company' => $data['current_company'] ?? null,
            'company_role' => $data['company_role'] ?? null,
            'education' => $data['education'] ?? null,
            'linkedin_url' => $this->normalizeLinkedInUrl($data['linkedin_url'] ?? null),
            'notes' => $data['notes'] ?? null,
        ];

        $contactData['network_roles'] = ['candidate'];
        $contact = Contact::create($contactData);
        return ['contact' => $contact, 'duplicate' => false];
    }
}
