<?php

namespace App\Services;

use Google\Cloud\AIPlatform\V1\Client\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\GenerateContentRequest;
use Google\Cloud\AIPlatform\V1\Part;
use Google\Cloud\AIPlatform\V1\Content;
use Google\Cloud\AIPlatform\V1\GenerationConfig;
use Illuminate\Support\Facades\Log;

class LinkedInProfileParsingService
{
    protected string $projectId;
    protected string $location;
    protected string $modelId;

    public function __construct()
    {
        $projectId = config('services.google_cloud.project_id');
        if (empty($projectId)) {
            throw new \RuntimeException(
                'GOOGLE_CLOUD_PROJECT is not set. Configure it in your environment.'
            );
        }
        $this->projectId = (string) $projectId;
        $this->location = (string) (config('services.google_cloud.location') ?? 'europe-west4');
        $this->modelId = (string) (config('services.google_cloud.model') ?? 'gemini-2.0-flash-001');
    }

    /**
     * Parse LinkedIn profile text using Vertex AI (Gemini).
     *
     * @return array{success: bool, data?: array, error?: string}
     */
    public function parseProfile(string $profileText): array
    {
        if (empty(trim($profileText))) {
            return [
                'success' => false,
                'error' => 'Geen profieltekst ontvangen',
            ];
        }

        $maxChars = 30000;
        if (strlen($profileText) > $maxChars) {
            $profileText = substr($profileText, 0, $maxChars);
        }

        Log::info('LinkedIn profile parsing started', [
            'text_length' => strlen($profileText),
        ]);

        $prompt = <<<PROMPT
Je bent een parser voor LinkedIn-profielen. Analyseer de volgende ruwe tekst (vaak een volledige pagina-kopie) en extraheer persoons- en carrièregegevens.

Geef het resultaat terug als JSON met deze velden (alleen velden waarvoor je iets hebt):
- first_name: voornaam (VERPLICHT)
- prefix: tussenvoegsel zoals "van", "de", "van der" (optioneel)
- last_name: achternaam (VERPLICHT)
- date_of_birth: geboortedatum YYYY-MM-DD (optioneel, zelden op LinkedIn)
- email: e-mailadres (optioneel)
- phone: telefoonnummer (optioneel)
- location: woonplaats of regio (optioneel)
- education: hoogst genoten opleiding, exact één van: "MBO", "HBO", "UNI" (optioneel)
- current_company: huidige werkgever (optioneel; headline of bovenste ervaring)
- company_role: huidige functietitel (optioneel)
- skills: relevante vaardigheden, komma-gescheiden (optioneel)
- notes: korte professionele samenvatting (About/headline/ervaring; optioneel)
- work_experiences: array van werkervaringen, nieuwste eerst. Elk item:
  - job_title: functietitel (verplicht per item)
  - company_name: bedrijfsnaam (verplicht per item)
  - start_date: YYYY-MM-DD (bij alleen jaar: YYYY-01-01)
  - end_date: YYYY-MM-DD, of null bij "heden"/huidige functie
  - location: (optioneel)
  - description: korte taken/samenvatting (optioneel)

BELANGRIJK:
- Retourneer ALLEEN geldige JSON, geen markdown of uitleg.
- first_name en last_name zijn VERPLICHT.
- Negeer navigatie, cookies, voettekst en UI-ruis zoveel mogelijk.
- Nederlandse namen correct splitsen (voornaam / tussenvoegsel / achternaam).
- Als werkervaring onduidelijk is, laat dat item weg.

PROFIEL TEKST:
{$profileText}
PROMPT;

        try {
            $this->ensureGoogleCredentials();

            $client = new PredictionServiceClient([
                'apiEndpoint' => "{$this->location}-aiplatform.googleapis.com",
            ]);

            $part = (new Part())->setText($prompt);
            $content = (new Content())
                ->setRole('user')
                ->setParts([$part]);

            $generationConfig = (new GenerationConfig())
                ->setTemperature(0.1)
                ->setMaxOutputTokens(8192);

            $endpoint = "projects/{$this->projectId}/locations/{$this->location}/publishers/google/models/{$this->modelId}";
            $request = (new GenerateContentRequest())
                ->setModel($endpoint)
                ->setContents([$content])
                ->setGenerationConfig($generationConfig);

            $timeoutMs = (config('services.google_cloud.timeout_seconds', 180)) * 1000;
            $response = $client->generateContent($request, [
                'timeoutMillis' => $timeoutMs,
            ]);

            $responseText = '';
            foreach ($response->getCandidates() as $candidate) {
                foreach ($candidate->getContent()->getParts() as $part) {
                    $responseText .= $part->getText();
                }
            }

            $responseText = preg_replace('/^```json\s*/', '', $responseText);
            $responseText = preg_replace('/\s*```$/', '', $responseText);
            $responseText = trim($responseText);

            $data = json_decode($responseText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $repaired = $this->repairTruncatedJson($responseText);
                $data = json_decode($repaired, true);
            }

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('LinkedIn parse JSON error', ['content' => substr($responseText, 0, 2000)]);
                return [
                    'success' => false,
                    'error' => 'Ongeldige JSON van AI',
                ];
            }

            if (empty($data['first_name']) || empty($data['last_name'])) {
                return [
                    'success' => false,
                    'error' => 'Voornaam of achternaam niet gevonden in profiel',
                ];
            }

            if (isset($data['education'])) {
                $data['education'] = $this->normalizeEducation($data['education']);
            }

            return [
                'success' => true,
                'data' => $data,
            ];
        } catch (\Exception $e) {
            Log::error('LinkedIn parse exception', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => 'AI-fout: ' . $e->getMessage(),
            ];
        }
    }

    protected function ensureGoogleCredentials(): void
    {
        $credentialsPath = config('services.google_cloud.credentials');
        if (empty($credentialsPath)) {
            throw new \RuntimeException(
                'GOOGLE_APPLICATION_CREDENTIALS niet geconfigureerd. Zet in .env het pad naar je GCP service account JSON (bijv. storage/app/google-credentials.json).'
            );
        }
        if (!file_exists($credentialsPath)) {
            throw new \RuntimeException(
                "GCP credentials bestand niet gevonden: {$credentialsPath}. Controleer GOOGLE_APPLICATION_CREDENTIALS in .env."
            );
        }
        putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $credentialsPath);
    }

    /**
     * Probeer JSON te sluiten als het model halverwege stopte (tokenlimiet).
     */
    protected function repairTruncatedJson(string $json): string
    {
        $openBraces = substr_count($json, '{') - substr_count($json, '}');
        $openBrackets = substr_count($json, '[') - substr_count($json, ']');
        if ($openBraces < 0 || $openBrackets < 0) {
            return $json;
        }

        return $json . str_repeat(']', max(0, $openBrackets)) . str_repeat('}', max(0, $openBraces));
    }

    protected function normalizeEducation(?string $education): ?string
    {
        if (empty($education)) {
            return null;
        }
        $education = strtoupper(trim($education));
        if (in_array($education, ['MBO', 'HBO', 'UNI'])) {
            return $education;
        }
        $mapping = [
            'UNIVERSITEIT' => 'UNI',
            'UNIVERSITY' => 'UNI',
            'WO' => 'UNI',
            'MASTER' => 'UNI',
            'BACHELOR' => 'HBO',
            'HOGESCHOOL' => 'HBO',
        ];
        return $mapping[$education] ?? null;
    }
}
