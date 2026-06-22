<?php

namespace Database\Seeders;

use App\Models\DropdownOption;
use Illuminate\Database\Seeder;

/**
 * Canonieke dropdown-opties voor een tenant (NL-set).
 *
 * Eén bron van waarheid: zowel de demo-seeder (`demo:seed-accounts`) als de
 * legacy-import (`legacy:import --with-dropdowns`) gebruiken `seed()` hieronder.
 * Draait per tenant (DropdownOption gebruikt de tenant-connectie), dus roep
 * aan binnen tenant-context (`$tenant->makeCurrent()`).
 */
class DropdownOptionSeeder extends Seeder
{
    public function run(): void
    {
        self::seed();
    }

    /**
     * Upsert alle canonieke dropdown-opties (idempotent op type+value).
     *
     * @return int aantal verwerkte opties
     */
    public static function seed(): int
    {
        $count = 0;

        foreach (self::definitions() as $row) {
            DropdownOption::updateOrCreate(
                ['type' => $row['type'], 'value' => $row['value']],
                [
                    'label' => $row['label'],
                    'color' => $row['color'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => $row['is_active'],
                ]
            );
            $count++;
        }

        return $count;
    }

    /**
     * @return list<array{type: string, value: string, label: string, color: ?string, sort_order: int, is_active: bool}>
     */
    public static function definitions(): array
    {
        return [
            ['type' => 'education', 'value' => 'mbo', 'label' => 'Mbo', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'education', 'value' => 'hbo', 'label' => 'Hbo', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'education', 'value' => 'uni', 'label' => 'Uni', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'sector_category', 'value' => 'fmcg', 'label' => 'FMCG', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sector_category', 'value' => 'foodservice', 'label' => 'Foodservice', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sector_category', 'value' => 'andere', 'label' => 'Andere', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'retailer', 'label' => 'Retailer', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'groothandel', 'label' => 'Groothandel', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'leverancier', 'label' => 'Leverancier', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'industrie', 'label' => 'Industrie', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'supermarkten', 'label' => 'Supermarkten', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'sector_secondary_category', 'value' => 'andere', 'label' => 'Andere', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'sector_tertiary_category', 'value' => 'non_food', 'label' => 'Non-food', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sector_tertiary_category', 'value' => 'food', 'label' => 'Food', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sector_brand', 'value' => 'merk', 'label' => 'Merk', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sector_brand', 'value' => 'private_label', 'label' => 'Private label', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'vers', 'label' => 'Vers', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'zuivel_eieren', 'label' => 'Zuivel & eieren', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'diepvries', 'label' => 'Diepvries', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'dkw_houdbaar_voedsel', 'label' => 'DKW (houdbaar voedsel)', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'dranken', 'label' => 'Dranken', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'snacks_snoep', 'label' => 'Snacks & snoep', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'non_food', 'label' => 'Non-food', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'verpakkingen', 'label' => 'Verpakkingen', 'color' => null, 'sort_order' => 7, 'is_active' => true],
            ['type' => 'sector_label', 'value' => 'convenience_ready_to_use', 'label' => 'Convenience & ready-to-use', 'color' => null, 'sort_order' => 8, 'is_active' => true],
            ['type' => 'gender', 'value' => 'man', 'label' => 'Man', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'gender', 'value' => 'vrouw', 'label' => 'Vrouw', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'employment_type', 'value' => 'fulltime', 'label' => 'Fulltime', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'employment_type', 'value' => 'parttime', 'label' => 'Parttime', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'employment_type', 'value' => 'interim', 'label' => 'Interim', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'factuurcontact', 'label' => 'Factuurcontact', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'kandidaat', 'label' => 'Kandidaat', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'interimmer', 'label' => 'Interimmer', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'ambassadeur', 'label' => 'Ambassadeur', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'potentieel_management', 'label' => 'Potentieel Management', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'medebeslisser', 'label' => 'Medebeslisser', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'potentieel_directie', 'label' => 'Potentieel Directie', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'referentie_van_kandidaat', 'label' => 'Referentie van kandidaat', 'color' => null, 'sort_order' => 7, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'hr_eerste_contact_arbeidsvoorwaarden', 'label' => 'HR eerste contact arbeidsvoorwaarden', 'color' => null, 'sort_order' => 8, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'hr_recruiters', 'label' => 'HR Recruiters', 'color' => null, 'sort_order' => 9, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'directie', 'label' => 'Directie', 'color' => null, 'sort_order' => 10, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'eigenaar', 'label' => 'Eigenaar', 'color' => null, 'sort_order' => 11, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'expert', 'label' => 'Expert', 'color' => null, 'sort_order' => 12, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'coach', 'label' => 'Coach', 'color' => null, 'sort_order' => 13, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'oud_eigenaar', 'label' => 'Oud Eigenaar', 'color' => null, 'sort_order' => 14, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'oud_directeur', 'label' => 'Oud Directeur', 'color' => null, 'sort_order' => 15, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'commissaris', 'label' => 'Commissaris', 'color' => null, 'sort_order' => 16, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'investeerder', 'label' => 'Investeerder', 'color' => null, 'sort_order' => 17, 'is_active' => true],
            ['type' => 'network_role', 'value' => 'netwerk_groep', 'label' => 'Netwerk Groep', 'color' => null, 'sort_order' => 18, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => '1e_contact_moment', 'label' => '1e contact moment', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => '1e_gesprek_online_of_offline', 'label' => '1e gesprek online of offline', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'test_afnemen', 'label' => 'Test afnemen', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'sollicitatietraining', 'label' => 'Sollicitatietraining', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => '1e_gesprek_klant', 'label' => '1e gesprek klant', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => '2e_gesprek_klant', 'label' => '2e gesprek klant', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'arbeidsvoorwaardengesprek', 'label' => 'Arbeidsvoorwaardengesprek', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'eindgesprek_klant', 'label' => 'Eindgesprek klant', 'color' => null, 'sort_order' => 7, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'bedrijfstest_afnemen', 'label' => 'Bedrijfstest afnemen', 'color' => null, 'sort_order' => 8, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'aangenomen', 'label' => 'Aangenomen', 'color' => null, 'sort_order' => 9, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'afgewezen', 'label' => 'Afgewezen', 'color' => null, 'sort_order' => 10, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'opdracht_on_hold', 'label' => 'Opdracht on hold', 'color' => null, 'sort_order' => 11, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'administratief_voltooid', 'label' => 'Administratief voltooid', 'color' => null, 'sort_order' => 12, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'schaduwmanagement', 'label' => 'Schaduwmanagement', 'color' => null, 'sort_order' => 13, 'is_active' => true],
            ['type' => 'assignment_status', 'value' => 'voltooid', 'label' => 'Voltooid', 'color' => null, 'sort_order' => 14, 'is_active' => true],
            // Kandidaat-status op een opdracht (assignment_contact.pivot.status). Values MOETEN
            // matchen met bestaande pivot-data + de frontend, anders 422 bij status wijzigen.
            ['type' => 'candidate_assignment_status', 'value' => 'called', 'label' => 'Gebeld', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'candidate_assignment_status', 'value' => 'proposed', 'label' => 'Voorgesteld', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'candidate_assignment_status', 'value' => 'first_interview', 'label' => '1e gesprek', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'candidate_assignment_status', 'value' => 'second_interview', 'label' => '2e gesprek', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'candidate_assignment_status', 'value' => 'hired', 'label' => 'Aangenomen', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'candidate_assignment_status', 'value' => 'rejected', 'label' => 'Afgewezen', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'reiskostenvergoeding', 'label' => 'Reiskostenvergoeding', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'pensioen', 'label' => 'Pensioen', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'dienstreizen_vergoeding', 'label' => 'Dienstreizen vergoeding', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'mogelijkheid_tot_promotie', 'label' => 'Mogelijkheid tot promotie', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'flexibele_werkuren', 'label' => 'Flexibele werkuren', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'personeelskorting', 'label' => 'Personeelskorting', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'bedrijfsfeesten', 'label' => 'Bedrijfsfeesten', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'productkorting_werknemers', 'label' => 'Productkorting werknemers', 'color' => null, 'sort_order' => 7, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'auto_van_de_zaak', 'label' => 'Auto van de zaak', 'color' => null, 'sort_order' => 8, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'budget_voor_professionele_ontwikkeling', 'label' => 'Budget voor professionele ontwikkeling', 'color' => null, 'sort_order' => 9, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'zorgverzekering', 'label' => 'Zorgverzekering', 'color' => null, 'sort_order' => 10, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'collectieve_zorgverzekering', 'label' => 'Collectieve zorgverzekering', 'color' => null, 'sort_order' => 11, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'bedrijfsopleiding', 'label' => 'Bedrijfsopleiding', 'color' => null, 'sort_order' => 12, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'vrijdagmiddagborrel', 'label' => 'Vrijdagmiddagborrel', 'color' => null, 'sort_order' => 13, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'kerstpakket', 'label' => 'Kerstpakket', 'color' => null, 'sort_order' => 14, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'extra_vakantiedagen', 'label' => 'Extra vakantiedagen', 'color' => null, 'sort_order' => 15, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'fietsplan', 'label' => 'Fietsplan', 'color' => null, 'sort_order' => 16, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'bedrijfsfitness', 'label' => 'Bedrijfsfitness', 'color' => null, 'sort_order' => 17, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'winstdeling', 'label' => 'Winstdeling', 'color' => null, 'sort_order' => 18, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'werk_vanuit_huis', 'label' => 'Werk vanuit huis', 'color' => null, 'sort_order' => 19, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'telefoon_van_de_zaak', 'label' => 'Telefoon van de zaak', 'color' => null, 'sort_order' => 20, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'telefoonplan', 'label' => 'Telefoonplan', 'color' => null, 'sort_order' => 21, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'aanvullend_pensioen', 'label' => 'Aanvullend pensioen', 'color' => null, 'sort_order' => 22, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'gezondeheidsprogramma', 'label' => 'Gezondeheidsprogramma', 'color' => null, 'sort_order' => 23, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'lunchkorting', 'label' => 'Lunchkorting', 'color' => null, 'sort_order' => 24, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'kosteloos_parkeren', 'label' => 'Kosteloos parkeren', 'color' => null, 'sort_order' => 25, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'levensverzekering', 'label' => 'Levensverzekering', 'color' => null, 'sort_order' => 26, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'aandelenopties', 'label' => 'Aandelenopties', 'color' => null, 'sort_order' => 27, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'taaltraining_aangeboden', 'label' => 'Taaltraining aangeboden', 'color' => null, 'sort_order' => 28, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'kinderopvang', 'label' => 'Kinderopvang', 'color' => null, 'sort_order' => 29, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'verhuisvergoeding', 'label' => 'Verhuisvergoeding', 'color' => null, 'sort_order' => 30, 'is_active' => true],
            ['type' => 'benefit', 'value' => 'huisvestingsvergoeding', 'label' => 'Huisvestingsvergoeding', 'color' => null, 'sort_order' => 31, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Marketing', 'label' => 'Marketing', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Sales', 'label' => 'Sales', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Inkoop', 'label' => 'Inkoop', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Supply Chain', 'label' => 'Supply Chain', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Finance', 'label' => 'Finance', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Directie', 'label' => 'Directie', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ['type' => 'sales_target', 'value' => 'Category Management', 'label' => 'Category Management', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'potential', 'label' => 'Potentieel', 'color' => null, 'sort_order' => 0, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'potential_first_assignment', 'label' => 'Potentieel (1e opdracht)', 'color' => null, 'sort_order' => 1, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'new_client', 'label' => 'Nieuwe klant', 'color' => null, 'sort_order' => 2, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'active_client', 'label' => 'Actieve klant', 'color' => null, 'sort_order' => 3, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'inactive', 'label' => 'Inactief', 'color' => null, 'sort_order' => 4, 'is_active' => true],
            ['type' => 'client_status', 'value' => 'lost', 'label' => 'Verloren', 'color' => null, 'sort_order' => 5, 'is_active' => true],
        ];
    }
}
