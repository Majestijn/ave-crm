<?php

namespace App\Support;

use App\Models\DropdownOption;

/**
 * Gedeelde sector-/classificatievelden die zowel op accounts als contacts
 * voorkomen: hoofdcategorie, secundaire & tertiaire categorie, merken en labels.
 *
 * Houdt de dropdown-typenamen en bijbehorende validatieregels op één plek,
 * zodat ze niet langer in elke controller en FormRequest gekopieerd staan.
 */
class ClassificationRules
{
    /** Dropdown-option types waartegen de classificatievelden valideren. */
    public const TYPE_CATEGORY = 'sector_category';
    public const TYPE_SECONDARY_CATEGORY = 'sector_secondary_category';
    public const TYPE_TERTIARY_CATEGORY = 'sector_tertiary_category';
    public const TYPE_BRAND = 'sector_brand';
    public const TYPE_LABEL = 'sector_label';

    /**
     * Validatieregels voor de gedeelde classificatievelden.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'category' => ['nullable', 'string', DropdownOption::validationRule(self::TYPE_CATEGORY)],
            'secondary_category' => ['nullable', 'string', DropdownOption::validationRule(self::TYPE_SECONDARY_CATEGORY)],
            'tertiary_category' => ['nullable', 'array'],
            'tertiary_category.*' => ['string', DropdownOption::validationRule(self::TYPE_TERTIARY_CATEGORY)],
            'merken' => ['nullable', 'array'],
            'merken.*' => ['string', DropdownOption::validationRule(self::TYPE_BRAND)],
            'labels' => ['nullable', 'array'],
            'labels.*' => ['string', DropdownOption::validationRule(self::TYPE_LABEL)],
        ];
    }

    /** Classificatieveld => bijbehorend dropdown-type. */
    private const FIELD_TYPES = [
        'category' => self::TYPE_CATEGORY,
        'secondary_category' => self::TYPE_SECONDARY_CATEGORY,
        'tertiary_category' => self::TYPE_TERTIARY_CATEGORY,
        'merken' => self::TYPE_BRAND,
        'labels' => self::TYPE_LABEL,
    ];

    /**
     * Normaliseer classificatiewaarden naar de dropdown-option `value`.
     *
     * Legacy-data (o.a. uit de oude seeder en de legacy-import) bewaarde de
     * zichtbare *label* ("Non-food", "Overig") terwijl de huidige opties
     * geslugificeerde values gebruiken ("non_food", "overig"). Een waarde die
     * exact matcht met een label (case-insensitive) wordt omgezet naar de
     * bijbehorende value; een waarde die al een geldige value is, of nergens
     * mee matcht, blijft ongewijzigd (validatie vangt dat laatste alsnog af).
     *
     * Geeft alleen de velden terug die in $input aanwezig zijn.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalize(array $input): array
    {
        $normalized = [];

        foreach (self::FIELD_TYPES as $field => $type) {
            if (!array_key_exists($field, $input)) {
                continue;
            }

            $value = $input[$field];

            if ($value === null) {
                $normalized[$field] = null;
                continue;
            }

            $resolve = self::valueResolver($type);

            $normalized[$field] = is_array($value)
                ? array_values(array_map($resolve, $value))
                : $resolve($value);
        }

        return $normalized;
    }

    /**
     * Bouw een resolver voor één dropdown-type: laat geldige values door en
     * zet een (case-insensitive) label om naar de bijbehorende value.
     */
    private static function valueResolver(string $type): callable
    {
        $options = DropdownOption::where('type', $type)->get(['value', 'label']);
        $values = $options->pluck('value')->all();

        $byLabel = [];
        foreach ($options as $option) {
            $byLabel[mb_strtolower(trim((string) $option->label))] = $option->value;
        }

        return static function ($value) use ($values, $byLabel) {
            if (!is_string($value) || in_array($value, $values, true)) {
                return $value;
            }

            return $byLabel[mb_strtolower(trim($value))] ?? $value;
        };
    }
}
