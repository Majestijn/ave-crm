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
}
