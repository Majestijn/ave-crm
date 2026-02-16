<?php

namespace App\Services;

use Google\Cloud\AIPlatform\V1\Client\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\GenerateContentRequest;
use Google\Cloud\AIPlatform\V1\Part;
use Google\Cloud\AIPlatform\V1\Content;
use Google\Cloud\AIPlatform\V1\GenerationConfig;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;

class CvParsingService
{
    protected string $projectId;
    protected string $location;
    protected string $modelId;

    public function __construct()
    {
        $projectId = config('services.google_cloud.project_id');
        if (empty($projectId)) {
            throw new \RuntimeException(
                'GOOGLE_CLOUD_PROJECT is not set. Add it to your Forge Environment variables and run: php artisan config:clear && php artisan config:cache'
            );
        }
        $this->projectId = (string) $projectId;
        $this->location = (string) (config('services.google_cloud.location') ?? 'europe-west4');
        $this->modelId = (string) (config('services.google_cloud.model') ?? 'gemini-2.0-flash-001');
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
     * Extract text from PDF using pdftotext (poppler-utils) for better handling
     * of complex layouts, link boxes, and overlapping elements.
     * Falls back to Smalot\PdfParser if pdftotext is not available.
     */
    protected function extractFromPdf(string $filePath): string
    {
        // Try pdftotext first (much better with complex PDFs)
        $pdftotextPath = trim(shell_exec('which pdftotext 2>/dev/null') ?? '');

        if (!empty($pdftotextPath)) {
            $escapedPath = escapeshellarg($filePath);
            $output = shell_exec("pdftotext -layout {$escapedPath} - 2>/dev/null");

            if (!empty(trim($output ?? ''))) {
                Log::info('PDF text extracted via pdftotext', [
                    'file' => basename($filePath),
                    'text_length' => strlen($output),
                ]);
                return $output;
            }

            Log::warning('pdftotext returned empty output, falling back to PdfParser', [
                'file' => basename($filePath),
            ]);
        }

        // Fallback to Smalot PdfParser
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

        // First, try to extract headers from raw XML (more reliable)
        $headerText = $this->extractHeadersFromXml($filePath);
        if (!empty($headerText)) {
            $text .= $headerText . "\n";
        }

        foreach ($phpWord->getSections() as $section) {
            // Extract headers first (often contain name/contact info)
            foreach (['first', 'even', 'default'] as $headerType) {
                $header = $section->getHeader($headerType);
                if ($header) {
                    foreach ($header->getElements() as $element) {
                        $text .= $this->extractTextFromElement($element) . "\n";
                    }
                }
            }

            // Extract main body content
            foreach ($section->getElements() as $element) {
                $text .= $this->extractTextFromElement($element) . "\n";
            }

            // Extract footers (might contain contact info)
            foreach (['first', 'even', 'default'] as $footerType) {
                $footer = $section->getFooter($footerType);
                if ($footer) {
                    foreach ($footer->getElements() as $element) {
                        $text .= $this->extractTextFromElement($element) . "\n";
                    }
                }
            }
        }

        // If no text found, try alternative extraction using strip_tags on XML
        if (empty(trim($text))) {
            $text = $this->extractFromWordFallback($filePath);
        }

        return $text;
    }

    /**
     * Extract headers from Word document XML
     */
    protected function extractHeadersFromXml(string $filePath): string
    {
        $text = '';

        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            for ($i = 1; $i <= 3; $i++) {
                $headerContent = $zip->getFromName("word/header{$i}.xml");
                if ($headerContent) {
                    $headerText = strip_tags($headerContent);
                    $headerText = html_entity_decode($headerText, ENT_QUOTES | ENT_XML1, 'UTF-8');
                    $headerText = preg_replace('/\s+/', ' ', $headerText);
                    $text .= trim($headerText) . "\n";
                }
            }
            $zip->close();
        }

        return trim($text);
    }

    /**
     * Fallback extraction by reading raw XML from docx
     */
    protected function extractFromWordFallback(string $filePath): string
    {
        $text = '';

        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            // Read headers first (often contain name)
            for ($i = 1; $i <= 3; $i++) {
                $headerContent = $zip->getFromName("word/header{$i}.xml");
                if ($headerContent) {
                    $headerText = strip_tags($headerContent);
                    $headerText = html_entity_decode($headerText, ENT_QUOTES | ENT_XML1, 'UTF-8');
                    $headerText = preg_replace('/\s+/', ' ', $headerText);
                    $text .= trim($headerText) . "\n";
                }
            }

            // Read the main document content
            $content = $zip->getFromName('word/document.xml');
            if ($content) {
                // Remove XML tags and decode entities
                $docText = strip_tags($content);
                $docText = html_entity_decode($docText, ENT_QUOTES | ENT_XML1, 'UTF-8');
                // Clean up whitespace
                $docText = preg_replace('/\s+/', ' ', $docText);
                $text .= $docText;
            }

            // Read footers (might contain contact info)
            for ($i = 1; $i <= 3; $i++) {
                $footerContent = $zip->getFromName("word/footer{$i}.xml");
                if ($footerContent) {
                    $footerText = strip_tags($footerContent);
                    $footerText = html_entity_decode($footerText, ENT_QUOTES | ENT_XML1, 'UTF-8');
                    $footerText = preg_replace('/\s+/', ' ', $footerText);
                    $text .= "\n" . trim($footerText);
                }
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
     * Parse CV text using Vertex AI (Online Prediction)
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
    public function parseWithVertex(string $text): array
    {
        if (empty($this->projectId)) {
            return [
                'success' => false,
                'error' => 'Google Cloud Project ID not configured',
            ];
        }

        // Log incoming text length for debugging
        Log::info('Vertex AI parsing started', [
            'text_length' => strlen($text),
            'first_100_chars' => substr($text, 0, 100),
            'model' => $this->modelId,
        ]);

        // Limit text to 30,000 characters (token limit safety)
        $maxChars = 30000;
        if (strlen($text) > $maxChars) {
            $text = substr($text, 0, $maxChars);
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
- Retourneer ALLEEN geldige JSON, geen andere tekst.
- Als je een veld niet kunt vinden, laat het dan weg uit de JSON.
- first_name en last_name zijn VERPLICHT.
- Zorg dat Nederlandse namen correct worden geparsed.

CV TEKST:
{$text}
PROMPT;

        try {
            // Initialize Client
            $client = new PredictionServiceClient([
                'apiEndpoint' => "{$this->location}-aiplatform.googleapis.com",
            ]);

            // Prepare Content
            $part = (new Part())->setText($prompt);
            $content = (new Content())
                ->setRole('user')
                ->setParts([$part]);

            // Configuration
            $generationConfig = (new GenerationConfig())
                ->setTemperature(0.1)
                ->setMaxOutputTokens(8192);

            // Construct Resource Name
            $endpoint = "projects/{$this->projectId}/locations/{$this->location}/publishers/google/models/{$this->modelId}";

            // Execute Request
            $request = (new GenerateContentRequest())
                ->setModel($endpoint)
                ->setContents([$content])
                ->setGenerationConfig($generationConfig);

            $response = $client->generateContent($request);

            // Process Response
            $responseText = '';
            foreach ($response->getCandidates() as $candidate) {
                // Vertex AI sometimes streams, but here we just concat
                foreach ($candidate->getContent()->getParts() as $part) {
                    $responseText .= $part->getText();
                }
            }

            // Clean up Markdown JSON blocks
            $responseText = preg_replace('/^```json\s*/', '', $responseText);
            $responseText = preg_replace('/\s*```$/', '', $responseText);
            $responseText = trim($responseText);

            Log::info('Vertex AI raw response', ['response' => substr($responseText, 0, 500)]);

            $data = json_decode($responseText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Vertex AI JSON parse error', ['error' => json_last_error_msg(), 'content' => $responseText]);
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response from Vertex AI',
                ];
            }

            // Validate required fields
            if (empty($data['first_name']) || empty($data['last_name'])) {
                return [
                    'success' => false,
                    'error' => 'Voornaam of achternaam niet gevonden in CV',
                ];
            }

            // Normalize fields
            if (isset($data['education'])) {
                $data['education'] = $this->normalizeEducation($data['education']);
            }

            return [
                'success' => true,
                'data' => $data,
            ];

        } catch (\Exception $e) {
            Log::error('Vertex AI Exception', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => 'Vertex AI Error: ' . $e->getMessage(),
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

            return $this->parseWithVertex($text);
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
