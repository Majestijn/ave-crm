<?php

namespace Database\Seeders;

use App\Models\DropdownOption;
use Illuminate\Database\Seeder;

class DropdownOptionSeeder extends Seeder
{
    public function run(): void
    {
        $options = [
            'education' => [
                ['value' => 'MBO', 'label' => 'MBO'],
                ['value' => 'HBO', 'label' => 'HBO'],
                ['value' => 'UNI', 'label' => 'Universiteit'],
            ],

            'gender' => [
                ['value' => 'man', 'label' => 'Man'],
                ['value' => 'vrouw', 'label' => 'Vrouw'],
            ],

            'network_role' => [
                ['value' => 'invoice_contact', 'label' => 'Factuurcontact'],
                ['value' => 'candidate', 'label' => 'Kandidaat'],
                ['value' => 'interim', 'label' => 'Interimmer'],
                ['value' => 'ambassador', 'label' => 'Ambassadeur'],
                ['value' => 'potential_management', 'label' => 'Potentieel Management'],
                ['value' => 'co_decision_maker', 'label' => 'Medebeslisser'],
                ['value' => 'potential_directie', 'label' => 'Potentieel Directie'],
                ['value' => 'candidate_reference', 'label' => 'Referentie van kandidaat'],
                ['value' => 'hr_employment', 'label' => 'HR arbeidsvoorwaarden'],
                ['value' => 'hr_recruiters', 'label' => 'HR recruiters'],
                ['value' => 'directie', 'label' => 'Directie'],
                ['value' => 'owner', 'label' => 'Eigenaar'],
                ['value' => 'expert', 'label' => 'Expert'],
                ['value' => 'coach', 'label' => 'Coach'],
                ['value' => 'former_owner', 'label' => 'Oud eigenaar'],
                ['value' => 'former_director', 'label' => 'Oud directeur'],
                ['value' => 'commissioner', 'label' => 'Commissaris'],
                ['value' => 'investor', 'label' => 'Investeerder'],
                ['value' => 'network_group', 'label' => 'Netwerkgroep'],
                ['value' => 'budget_holder', 'label' => 'Budgethouder'],
                ['value' => 'candidate_placed', 'label' => 'Geplaatste kandidaat'],
                ['value' => 'client_principal', 'label' => 'Opdrachtgever'],
                ['value' => 'signing_authority', 'label' => 'Tekenbevoegdheid'],
                ['value' => 'final_decision_maker', 'label' => 'Eindbeslisser'],
            ],

            'assignment_status' => [
                ['value' => 'active', 'label' => 'Actief', 'color' => '#1976d2'],
                ['value' => 'proposed', 'label' => 'Voorgesteld', 'color' => '#d32f2f'],
                ['value' => 'hired', 'label' => 'Aangenomen', 'color' => '#2e7d32'],
                ['value' => 'shadow_management', 'label' => 'Shadow Management', 'color' => '#ed6c02'],
                ['value' => 'completed', 'label' => 'Voltooid', 'color' => '#2e7d32'],
                ['value' => 'cancelled', 'label' => 'Geannuleerd', 'color' => '#d32f2f'],
            ],

            'candidate_assignment_status' => [
                ['value' => 'called', 'label' => 'Gebeld', 'color' => '#2e7d32'],
                ['value' => 'proposed', 'label' => 'Voorgesteld', 'color' => '#ed6c02'],
                ['value' => 'first_interview', 'label' => '1e gesprek', 'color' => '#1976d2'],
                ['value' => 'second_interview', 'label' => '2e gesprek', 'color' => '#1976d2'],
                ['value' => 'hired', 'label' => 'Aangenomen', 'color' => '#2e7d32'],
                ['value' => 'rejected', 'label' => 'Afgewezen', 'color' => '#d32f2f'],
            ],

            'employment_type' => [
                ['value' => 'Fulltime', 'label' => 'Fulltime'],
                ['value' => 'Parttime', 'label' => 'Parttime'],
                ['value' => 'Freelance', 'label' => 'Freelance'],
                ['value' => 'Interim', 'label' => 'Interim'],
                ['value' => 'ZZP', 'label' => 'ZZP'],
            ],

            'benefit' => [
                ['value' => 'Reiskostenvergoeding', 'label' => 'Reiskostenvergoeding'],
                ['value' => 'Pensioen', 'label' => 'Pensioen'],
                ['value' => 'Dienstreizen vergoeding', 'label' => 'Dienstreizen vergoeding'],
                ['value' => 'Mogelijkheid tot promotie', 'label' => 'Mogelijkheid tot promotie'],
                ['value' => 'Flexibele werkuren', 'label' => 'Flexibele werkuren'],
                ['value' => 'Personeelskorting', 'label' => 'Personeelskorting'],
                ['value' => 'Bedrijfsfeesten', 'label' => 'Bedrijfsfeesten'],
                ['value' => 'Productkorting werknemers', 'label' => 'Productkorting werknemers'],
                ['value' => 'Auto van de zaak', 'label' => 'Auto van de zaak'],
                ['value' => 'Budget voor professionele ontwikkeling', 'label' => 'Budget voor professionele ontwikkeling'],
                ['value' => 'Zorgverzekering', 'label' => 'Zorgverzekering'],
                ['value' => 'Collectieve zorgverzekering', 'label' => 'Collectieve zorgverzekering'],
                ['value' => 'Bedrijfsopleiding', 'label' => 'Bedrijfsopleiding'],
                ['value' => 'Vrijdagmiddagborrel', 'label' => 'Vrijdagmiddagborrel'],
                ['value' => 'Kerstpakket', 'label' => 'Kerstpakket'],
                ['value' => 'Extra vakantiedagen', 'label' => 'Extra vakantiedagen'],
                ['value' => 'Fietsplan', 'label' => 'Fietsplan'],
                ['value' => 'Bedrijfsfitness', 'label' => 'Bedrijfsfitness'],
                ['value' => 'Winstdeling', 'label' => 'Winstdeling'],
                ['value' => 'Werk vanuit huis', 'label' => 'Werk vanuit huis'],
                ['value' => 'Telefoon van de zaak', 'label' => 'Telefoon van de zaak'],
                ['value' => 'Telefoonplan', 'label' => 'Telefoonplan'],
                ['value' => 'Aanvullend pensioen', 'label' => 'Aanvullend pensioen'],
                ['value' => 'Gezondheidsprogramma', 'label' => 'Gezondheidsprogramma'],
                ['value' => 'Lunchkorting', 'label' => 'Lunchkorting'],
                ['value' => 'Kosteloos parkeren', 'label' => 'Kosteloos parkeren'],
                ['value' => 'Levensverzekering', 'label' => 'Levensverzekering'],
                ['value' => 'Aandelenopties', 'label' => 'Aandelenopties'],
                ['value' => 'Taaltraining aangeboden', 'label' => 'Taaltraining aangeboden'],
                ['value' => 'Kinderopvang', 'label' => 'Kinderopvang'],
                ['value' => 'Verhuisvergoeding', 'label' => 'Verhuisvergoeding'],
                ['value' => 'Huisvestingsvergoeding', 'label' => 'Huisvestingsvergoeding'],
            ],

            'account_category' => [
                ['value' => 'FMCG', 'label' => 'FMCG'],
                ['value' => 'Foodservice', 'label' => 'Foodservice'],
                ['value' => 'Overig', 'label' => 'Overig'],
            ],

            'account_secondary_category' => [
                ['value' => 'Retailer', 'label' => 'Retailer'],
                ['value' => 'Supermarkten', 'label' => 'Supermarkten'],
                ['value' => 'Groothandel', 'label' => 'Groothandel'],
                ['value' => 'Leverancier', 'label' => 'Leverancier'],
                ['value' => 'Industrie', 'label' => 'Industrie'],
                ['value' => 'Andere', 'label' => 'Andere'],
            ],

            'account_tertiary_category' => [
                ['value' => 'Non-food', 'label' => 'Non-food'],
                ['value' => 'Food', 'label' => 'Food'],
            ],

            'account_brand' => [
                ['value' => 'Merk', 'label' => 'Merk'],
                ['value' => 'Private label', 'label' => 'Private label'],
            ],

            'account_label' => [
                ['value' => 'Vers', 'label' => 'Vers'],
                ['value' => 'Zuivel & eieren', 'label' => 'Zuivel & eieren'],
                ['value' => 'Diepvries', 'label' => 'Diepvries'],
                ['value' => 'DKW (houdbaar voedsel)', 'label' => 'DKW (houdbaar voedsel)'],
                ['value' => 'Dranken', 'label' => 'Dranken'],
                ['value' => 'Snacks & snoep', 'label' => 'Snacks & snoep'],
                ['value' => 'Non-food', 'label' => 'Non-food'],
                ['value' => 'Verpakkingen', 'label' => 'Verpakkingen'],
                ['value' => 'Convenience & ready-to-use', 'label' => 'Convenience & ready-to-use'],
            ],

            'sales_target' => [
                ['value' => 'Marketing', 'label' => 'Marketing'],
                ['value' => 'Sales', 'label' => 'Sales'],
                ['value' => 'Inkoop', 'label' => 'Inkoop'],
                ['value' => 'Supply Chain', 'label' => 'Supply Chain'],
                ['value' => 'Finance', 'label' => 'Finance'],
                ['value' => 'Directie', 'label' => 'Directie'],
            ],

            'client_status' => [
                ['value' => 'potential', 'label' => 'Potentieel'],
                ['value' => 'potential_first_assignment', 'label' => 'Potentieel (1e opdracht)'],
                ['value' => 'new_client', 'label' => 'Nieuwe klant'],
                ['value' => 'active_client', 'label' => 'Actieve klant'],
                ['value' => 'inactive', 'label' => 'Inactief'],
                ['value' => 'lost', 'label' => 'Verloren'],
            ],

            'activity_type' => [
                ['value' => 'call', 'label' => 'Gebeld'],
                ['value' => 'proposal', 'label' => 'Voorgesteld'],
                ['value' => 'interview', 'label' => 'Gesprek'],
                ['value' => 'hired', 'label' => 'Aangenomen'],
                ['value' => 'rejected', 'label' => 'Afgewezen'],
                ['value' => 'personality_test', 'label' => 'Persoonlijkheidstest afgenomen'],
                ['value' => 'test', 'label' => 'Test afgenomen'],
                ['value' => 'interview_training', 'label' => 'Sollicitatie training'],
            ],

            'calendar_event_type' => [
                ['value' => 'meeting', 'label' => 'Afspraak', 'color' => '#818cf8'],
                ['value' => 'call', 'label' => 'Bellen', 'color' => '#38bdf8'],
                ['value' => 'interview', 'label' => 'Interview', 'color' => '#a78bfa'],
                ['value' => 'reminder', 'label' => 'Herinnering', 'color' => '#fb923c'],
                ['value' => 'other', 'label' => 'Anders', 'color' => '#94a3b8'],
            ],
        ];

        foreach ($options as $type => $items) {
            foreach ($items as $index => $item) {
                DropdownOption::updateOrCreate(
                    ['type' => $type, 'value' => $item['value']],
                    [
                        'label' => $item['label'],
                        'color' => $item['color'] ?? null,
                        'sort_order' => $index,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
