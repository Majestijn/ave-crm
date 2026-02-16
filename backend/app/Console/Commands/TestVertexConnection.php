<?php

namespace App\Console\Commands;

use Google\Cloud\AIPlatform\V1\Client\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\GenerateContentRequest;
use Google\Cloud\AIPlatform\V1\Part;
use Google\Cloud\AIPlatform\V1\Content;
use Google\Cloud\AIPlatform\V1\GenerationConfig;
use Illuminate\Console\Command;

class TestVertexConnection extends Command
{
    protected $signature = 'vertex:test';
    protected $description = 'Test the Vertex AI API connection';

    public function handle(): int
    {
        $projectId = config('services.google_cloud.project_id');
        $location = config('services.google_cloud.location', 'europe-west4');
        $modelId = config('services.google_cloud.model', 'gemini-2.0-flash-001');
        $credentials = config('services.google_cloud.credentials');

        $this->info("Testing Vertex AI API...");
        $this->info("Project ID: {$projectId}");
        $this->info("Location: {$location}");
        $this->info("Model: {$modelId}");
        $this->info("Credentials: {$credentials}");

        if (empty($projectId) || empty($credentials)) {
            $this->error("❌ GOOGLE_CLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS is not set in .env");
            return 1;
        }

        if (!file_exists(base_path($credentials)) && !file_exists($credentials)) {
             $this->warn("⚠️  Credentials file not found at: " . base_path($credentials));
             $this->warn("    (This might be okay if using absolute path on server)");
        }

        $this->info("\nSending test request...");

        try {
            // Initialize Client
            $client = new PredictionServiceClient([
                'apiEndpoint' => "{$location}-aiplatform.googleapis.com",
            ]);

            // Construct Endpoint Resource Name
            $endpoint = "projects/{$projectId}/locations/{$location}/publishers/google/models/{$modelId}";

            // Prepare Content
            $part = (new Part())->setText('Say "Hello, Vertex AI works!" in exactly those words.');
            $content = (new Content())
                ->setRole('user')
                ->setParts([$part]);

            // Execute Request
            $request = (new GenerateContentRequest())
                ->setModel($endpoint)
                ->setContents([$content]);

            $response = $client->generateContent($request);

            // Process Response
            $responseText = '';
            foreach ($response->getCandidates() as $candidate) {
                foreach ($candidate->getContent()->getParts() as $part) {
                    $responseText .= $part->getText();
                }
            }

            $this->info("✅ Success! Response: {$responseText}");
            // Removed return 0; here to allow Batch test to run

        } catch (\Exception $e) {
            $this->error("❌ Online Prediction Exception: " . $e->getMessage());
            return 1;
        }

        $this->info("\nTesting Batch Prediction Permissions...");
        
        try {
            // Initialize Job Client (used for Batch)
            $jobClient = new \Google\Cloud\AIPlatform\V1\Client\JobServiceClient([
                'apiEndpoint' => "{$location}-aiplatform.googleapis.com",
            ]);
            
            // Just try to list jobs to verify permissions (read-only safe test)
            $parent = $jobClient->locationName($projectId, $location);
            
            $request = (new \Google\Cloud\AIPlatform\V1\ListBatchPredictionJobsRequest())
                ->setParent($parent);
                
            $jobClient->listBatchPredictionJobs($request);
            
            $this->info("✅ Success! Batch Prediction Client initialized & permissions verified.");
            return 0;

        } catch (\Exception $e) {
             $this->error("❌ Batch Prediction Exception: " . $e->getMessage());
             $this->warn("Make sure the Service Account has 'Vertex AI User' role.");
             return 1;
        }
    }
}
