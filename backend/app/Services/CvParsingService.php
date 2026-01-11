<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;

class CvParsingService
{
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
        $this->model = config('services.gemini.model', 'gemini-2.5-flash');
    }

    /**
     * Extract text from PDF or Word document
     */
    public function extractText(string $filePath): string
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        return match ($extension) {
            'pdf' => $this->extractFromPdf($filePath),
            'doc', 'docx' => $this->extractFromWord($filePath),
            default => throw new \InvalidArgumentException("Unsupported file type: {$extension}"),
        };
    }

    /**
     * Extract text from PDF
     */
    protected function extractFromPdf(string $filePath): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($filePath);
        return $pdf->getText();
    }

    /**
     * Extract text from Word document
     */
    protected function extractFromWord(string $filePath): string
    {
        $phpWord = WordIOFactory::load($filePath);
        $text = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $text .= $this->extractTextFromElement($element) . "\n";
            }
        }

        // If no text found, try alternative extraction using strip_tags on XML
        if (empty(trim($text))) {
            $text = $this->extractFromWordFallback($filePath);
        }

        return $text;
    }

    /**
     * Fallback extraction by reading raw XML from docx
     */
    protected function extractFromWordFallback(string $filePath): string
    {
        $text = '';

        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            // Read the main document content
            $content = $zip->getFromName('word/document.xml');
            if ($content) {
                // Remove XML tags and decode entities
                $text = strip_tags($content);
                $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
                // Clean up whitespace
                $text = preg_replace('/\s+/', ' ', $text);
            }
            $zip->close();
        }

        return $text;
    }

    /**
     * Recursively extract text from Word elements
     */
    protected function extractTextFromElement($element): string
    {
        $text = '';

        // Handle Text elements
        if (method_exists($element, 'getText')) {
            $text .= $element->getText() . ' ';
        }

        // Handle TextRun elements (contains multiple text pieces)
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $text .= $this->extractTextFromElement($child);
            }
        }

        // Handle Table elements
        if ($element instanceof \PhpOffice\PhpWord\Element\Table) {
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $cellElement) {
                        $text .= $this->extractTextFromElement($cellElement) . ' ';
                    }
                }
                $text .= "\n";
            }
        }

        // Handle ListItem elements
        if ($element instanceof \PhpOffice\PhpWord\Element\ListItem) {
            $textObj = $element->getTextObject();
            if ($textObj) {
                $text .= '• ' . $this->extractTextFromElement($textObj) . "\n";
            }
        }

        return $text;
    }

    /**
     * Parse CV text using Gemini AI
     * 
     * @return array{
     *   success: bool,
     *   data?: array{
     *     first_name?: string,
     *     prefix?: string,
     *     last_name?: string,
     *     email?: string,
     *     phone?: string,
     *     location?: string,
     *     education?: string,
     *     current_role?: string,
     *     skills?: string
     *   },
     *   error?: string
     * }
     */
    public function parseWithGemini(string $text): array
    {
        if (empty($this->apiKey)) {
            return [
                'success' => false,
                'error' => 'Gemini API key not configured',
            ];
        }

        $prompt = <<<PROMPT
Je bent een CV-parser. Analyseer de volgende CV-tekst en extraheer de kandidaatgegevens.

Geef het resultaat terug als JSON met ALLEEN deze velden:
- first_name: voornaam (VERPLICHT)
- prefix: tussenvoegsel zoals "van", "de", "van der" (optioneel, alleen als aanwezig)
- last_name: achternaam (VERPLICHT)
- date_of_birth: geboortedatum in formaat YYYY-MM-DD (optioneel)
- email: e-mailadres (optioneel)
- phone: telefoonnummer (optioneel)
- location: woonplaats of stad (optioneel)
- education: hoogst genoten opleiding, moet één van deze zijn: "MBO", "HBO", of "UNI" (optioneel)
- current_company: huidige of meest recente werkgever/bedrijfsnaam (optioneel)
- current_role: huidige of meest recente functietitel (optioneel)
- skills: relevante vaardigheden, gescheiden door komma's (optioneel)

BELANGRIJK:
- Retourneer ALLEEN geldige JSON, geen andere tekst
- Als je een veld niet kunt vinden, laat het dan weg uit de JSON
- first_name en last_name zijn VERPLICHT - als je deze niet kunt vinden, retourneer dan: {"error": "Naam niet gevonden"}
- Zorg dat Nederlandse namen correct worden geparsed (bijv. "Jan van der Berg" = first_name: "Jan", prefix: "van der", last_name: "Berg")

CV TEKST:
{$text}

JSON RESPONSE:
PROMPT;

        try {
            $response = Http::timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'maxOutputTokens' => 8192,
                    ]
                ]
            );

            if (!$response->successful()) {
                Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                // Throw exception for rate limiting so the job can retry
                if ($response->status() === 429) {
                    throw new \RuntimeException('Gemini API rate limit exceeded (429). Will retry.');
                }

                return [
                    'success' => false,
                    'error' => 'Gemini API error: ' . $response->status(),
                ];
            }

            $result = $response->json();

            // Log the full response for debugging
            Log::info('Gemini API response', [
                'has_candidates' => isset($result['candidates']),
                'candidates_count' => count($result['candidates'] ?? []),
                'prompt_feedback' => $result['promptFeedback'] ?? null,
                'finish_reason' => $result['candidates'][0]['finishReason'] ?? null,
            ]);

            // Check for content filtering or safety blocks
            if (isset($result['promptFeedback']['blockReason'])) {
                Log::warning('Gemini blocked the request', [
                    'block_reason' => $result['promptFeedback']['blockReason'],
                ]);
                return [
                    'success' => false,
                    'error' => 'Gemini content blocked: ' . $result['promptFeedback']['blockReason'],
                ];
            }

            $content = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if (!$content) {
                Log::warning('Empty Gemini response', [
                    'full_response' => json_encode($result),
                ]);
                return [
                    'success' => false,
                    'error' => 'Empty response from Gemini',
                ];
            }

            // Clean up the response (remove markdown code blocks if present)
            $content = preg_replace('/^```json\s*/', '', $content);
            $content = preg_replace('/\s*```$/', '', $content);
            $content = trim($content);

            $data = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to parse Gemini response as JSON', [
                    'content' => $content,
                    'error' => json_last_error_msg(),
                ]);
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response from Gemini',
                ];
            }

            // Check for error response from AI
            if (isset($data['error'])) {
                return [
                    'success' => false,
                    'error' => $data['error'],
                ];
            }

            // Validate required fields
            if (empty($data['first_name']) || empty($data['last_name'])) {
                return [
                    'success' => false,
                    'error' => 'Voornaam of achternaam niet gevonden in CV',
                ];
            }

            // Map education to valid values
            if (isset($data['education'])) {
                $data['education'] = $this->normalizeEducation($data['education']);
            }

            return [
                'success' => true,
                'data' => $data,
            ];
        } catch (\Exception $e) {
            Log::error('Gemini API exception', [
                'message' => $e->getMessage(),
            ]);
            return [
                'success' => false,
                'error' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Normalize education level to valid enum values
     */
    protected function normalizeEducation(string $education): ?string
    {
        $education = strtoupper(trim($education));

        // Direct matches
        if (in_array($education, ['MBO', 'HBO', 'UNI'])) {
            return $education;
        }

        // Common variations
        $mapping = [
            'UNIVERSITEIT' => 'UNI',
            'UNIVERSITY' => 'UNI',
            'WO' => 'UNI',
            'MASTER' => 'UNI',
            'BACHELOR' => 'HBO',
            'HOGESCHOOL' => 'HBO',
            'HTS' => 'HBO',
            'HEAO' => 'HBO',
        ];

        return $mapping[$education] ?? null;
    }

    /**
     * Full CV parsing pipeline
     */
    public function parseCv(string $filePath): array
    {
        try {
            $text = $this->extractText($filePath);

            Log::info('CV text extraction result', [
                'file' => basename($filePath),
                'text_length' => strlen($text),
                'text_preview' => substr($text, 0, 500),
            ]);

            if (empty(trim($text))) {
                return [
                    'success' => false,
                    'error' => 'Geen tekst gevonden in het bestand',
                ];
            }

            // Ensure we have enough text to parse
            if (strlen(trim($text)) < 50) {
                return [
                    'success' => false,
                    'error' => 'Te weinig tekst gevonden in het bestand (' . strlen(trim($text)) . ' karakters)',
                ];
            }

            return $this->parseWithGemini($text);
        } catch (\Exception $e) {
            Log::error('CV parsing failed', [
                'file' => $filePath,
                'error' => $e->getMessage(),
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
