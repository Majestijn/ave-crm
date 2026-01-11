<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestGeminiConnection extends Command
{
    protected $signature = 'gemini:test';
    protected $description = 'Test the Gemini API connection';

    public function handle(): int
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2.0-flash');

        $this->info("Testing Gemini API...");
        $this->info("Model: {$model}");
        $this->info("API Key: " . substr($apiKey, 0, 10) . "..." . substr($apiKey, -4));

        if (empty($apiKey)) {
            $this->error("❌ GEMINI_API_KEY is not set in .env");
            return 1;
        }

        $this->info("\nSending test request...");

        try {
            $response = Http::timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => 'Say "Hello, the connection works!" in exactly those words.']
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'maxOutputTokens' => 100,
                    ]
                ]
            );

            $this->info("Response status: " . $response->status());

            if ($response->successful()) {
                $result = $response->json();
                $content = $result['candidates'][0]['content']['parts'][0]['text'] ?? 'No content';
                $this->info("✅ Success! Response: {$content}");
                return 0;
            } else {
                $this->error("❌ API Error: " . $response->status());
                $this->error("Response body:");
                $this->line($response->body());
                
                if ($response->status() === 429) {
                    $this->warn("\n⚠️  Rate limit (429) - Your API key has hit its quota.");
                    $this->warn("Check your quota at: https://aistudio.google.com/apikey");
                }
                
                if ($response->status() === 400) {
                    $body = $response->json();
                    if (str_contains($response->body(), 'API_KEY_INVALID')) {
                        $this->warn("\n⚠️  Invalid API key. Generate a new one at: https://aistudio.google.com/apikey");
                    }
                    if (str_contains($response->body(), 'not found')) {
                        $this->warn("\n⚠️  Model '{$model}' not found. Try changing GEMINI_MODEL in .env");
                        $this->warn("Available models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp");
                    }
                }
                
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("❌ Exception: " . $e->getMessage());
            return 1;
        }
    }
}
