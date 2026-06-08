<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Tenant;
use App\Support\ClassificationRules;
use Illuminate\Console\Command;

/**
 * Eenmalige opschoning: zet legacy classificatie-*labels* om naar de
 * dropdown-option *values* op bestaande accounts en contacten. Records die
 * nooit bewerkt worden helen niet vanzelf via de controller, en filters/
 * rapporten matchen op de value — vandaar deze bulk-actie.
 */
class NormalizeClassification extends Command
{
    protected $signature = 'classification:normalize
                            {--tenant= : Tenant ID (default: alle tenants)}
                            {--dry-run : Toon wat er zou wijzigen zonder op te slaan}';

    protected $description = 'Normaliseer classificatie-labels naar dropdown-values op accounts en contacten';

    private const FIELDS = ['category', 'secondary_category', 'tertiary_category', 'merken', 'labels'];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $tenantId = $this->option('tenant');

        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('Geen tenants gevonden.');
            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $tenant->makeCurrent();
            $this->info("Tenant: {$tenant->name} (id: {$tenant->id})" . ($dryRun ? ' [dry-run]' : ''));

            $orphans = [];
            $accounts = $this->normalizeModels(Account::query(), $dryRun, $orphans);
            $contacts = $this->normalizeModels(Contact::query(), $dryRun, $orphans);

            $this->line("  accounts gewijzigd: {$accounts}, contacten gewijzigd: {$contacts}");

            if ($orphans !== []) {
                $this->warn('  Onbekende legacy-waarden (geen match op value/label/alias) — voeg een alias toe in ClassificationRules::LEGACY_ALIASES:');
                foreach ($orphans as $field => $values) {
                    $this->line('    ' . $field . ': ' . implode(', ', array_keys(array_count_values($values))));
                }
            }
        }

        return self::SUCCESS;
    }

    /**
     * Normaliseer de classificatievelden van elk record in de query.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     * @param  array<string, list<string>>  $orphans  Verzamelt onoplosbare waarden per veld.
     * @return int  Aantal gewijzigde records.
     */
    private function normalizeModels($query, bool $dryRun, array &$orphans): int
    {
        $changed = 0;

        $query->chunkById(200, function ($records) use (&$changed, &$orphans, $dryRun) {
            foreach ($records as $record) {
                $current = [];
                foreach (self::FIELDS as $field) {
                    $current[$field] = $record->{$field};
                }

                $normalized = ClassificationRules::normalize($current);

                $dirty = false;
                foreach (self::FIELDS as $field) {
                    if ($normalized[$field] !== $current[$field]) {
                        $record->{$field} = $normalized[$field];
                        $dirty = true;
                    }
                }

                if ($dirty) {
                    $changed++;
                    if (!$dryRun) {
                        $record->saveQuietly();
                    }
                }

                foreach (ClassificationRules::orphans($current) as $field => $values) {
                    foreach ($values as $value) {
                        $orphans[$field][] = $value;
                    }
                }
            }
        });

        return $changed;
    }
}
