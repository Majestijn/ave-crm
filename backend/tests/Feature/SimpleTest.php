<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\Log;

class SimpleTest extends TestCase
{
    public function test_simple_assert()
    {
        Log::info('Simple test running');
        $this->assertTrue(true);
    }
}
