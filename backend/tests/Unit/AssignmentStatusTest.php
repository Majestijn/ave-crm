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
}
