<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    private string $apiKey;
    private string $baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

    public function __construct()
    {
        $this->apiKey = config('services.google.geocoding_api_key');
    }

    /**
     * Geocode a location string to coordinates
     * 
     * @param string $location The location to geocode (e.g., "Amsterdam, Netherlands")
     * @return array|null Returns ['latitude' => float, 'longitude' => float] or null on failure
     */
    public function geocode(string $location): ?array
    {
        if (empty($location)) {
            return null;
        }

        // Check cache first (cache for 30 days)
        $cacheKey = 'geocode:' . md5(strtolower(trim($location)));
        
        return Cache::remember($cacheKey, now()->addDays(30), function () use ($location) {
            return $this->fetchFromApi($location);
        });
    }

    /**
     * Fetch coordinates from Google Geocoding API
     */
    private function fetchFromApi(string $location): ?array
    {
        if (empty($this->apiKey)) {
            Log::warning('Google Geocoding API key not configured');
            return null;
        }

        try {
            $response = Http::get($this->baseUrl, [
                'address' => $location,
                'key' => $this->apiKey,
                'region' => 'nl', // Bias towards Netherlands
                'language' => 'nl',
            ]);

            if (!$response->successful()) {
                Log::error('Geocoding API request failed', [
                    'location' => $location,
                    'status' => $response->status(),
                ]);
                return null;
            }

            $data = $response->json();

            if ($data['status'] !== 'OK' || empty($data['results'])) {
                Log::info('Geocoding returned no results', [
                    'location' => $location,
                    'status' => $data['status'],
                ]);
                return null;
            }

            $geometry = $data['results'][0]['geometry']['location'];

            return [
                'latitude' => $geometry['lat'],
                'longitude' => $geometry['lng'],
            ];
        } catch (\Exception $e) {
            Log::error('Geocoding exception', [
                'location' => $location,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
     * 
     * @param float $lat1 Latitude of point 1
     * @param float $lng1 Longitude of point 1
     * @param float $lat2 Latitude of point 2
     * @param float $lng2 Longitude of point 2
     * @return float Distance in kilometers
     */
    public static function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // Earth's radius in kilometers

        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lngDelta / 2) * sin($lngDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
