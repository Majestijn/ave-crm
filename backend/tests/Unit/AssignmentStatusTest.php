<?php

namespace Tests\Unit;

use App\Support\AssignmentStatus;
use PHPUnit\Framework\TestCase;

class AssignmentStatusTest extends TestCase
{
    public function test_dutch_closed_statuses_are_recognised_as_closed(): void
    {
        $this->assertTrue(AssignmentStatus::isClosed('aangenomen'));
        $this->assertTrue(AssignmentStatus::isClosed('afgewezen'));
        $this->assertTrue(AssignmentStatus::isClosed('voltooid'));
        $this->assertTrue(AssignmentStatus::isClosed('administratief_voltooid'));
        $this->assertTrue(AssignmentStatus::isClosed('opdracht_on_hold'));
    }

    public function test_legacy_english_closed_statuses_are_recognised_as_closed(): void
    {
        $this->assertTrue(AssignmentStatus::isClosed('completed'));
        $this->assertTrue(AssignmentStatus::isClosed('cancelled'));
        $this->assertTrue(AssignmentStatus::isClosed('hired'));
    }

    public function test_ongoing_statuses_are_not_closed(): void
    {
        $this->assertFalse(AssignmentStatus::isClosed('1e_contact_moment'));
        $this->assertFalse(AssignmentStatus::isClosed('1e_gesprek_klant'));
        $this->assertFalse(AssignmentStatus::isClosed('arbeidsvoorwaardengesprek'));
        $this->assertFalse(AssignmentStatus::isClosed('schaduwmanagement'));
    }

    public function test_null_status_is_not_closed(): void
    {
        $this->assertFalse(AssignmentStatus::isClosed(null));
    }

    public function test_legacy_statuses_normalize_to_funnel_values(): void
    {
        $this->assertSame('1e_contact_moment', AssignmentStatus::normalize('active'));
        $this->assertSame('1e_contact_moment', AssignmentStatus::normalize('proposed'));
        $this->assertSame('aangenomen', AssignmentStatus::normalize('hired'));
        $this->assertSame('voltooid', AssignmentStatus::normalize('completed'));
        $this->assertSame('afgewezen', AssignmentStatus::normalize('cancelled'));
        $this->assertSame('schaduwmanagement', AssignmentStatus::normalize('shadow_management'));
    }

    public function test_valid_and_unknown_statuses_pass_through_normalize_unchanged(): void
    {
        $this->assertSame('aangenomen', AssignmentStatus::normalize('aangenomen'));
        $this->assertSame('1e_contact_moment', AssignmentStatus::normalize('1e_contact_moment'));
        $this->assertSame('iets_onbekends', AssignmentStatus::normalize('iets_onbekends'));
        $this->assertNull(AssignmentStatus::normalize(null));
    }

    public function test_default_status_is_a_valid_funnel_value(): void
    {
        $this->assertSame('1e_contact_moment', AssignmentStatus::DEFAULT);
        $this->assertFalse(AssignmentStatus::isClosed(AssignmentStatus::DEFAULT));
    }
}
