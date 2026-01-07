<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\CalendarEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;

class CalendarFeedController extends Controller
{
    /**
     * Get the iCal feed URL for the current user.
     */
    public function getUrl(Request $request)
    {
        $user = $request->user();
        $token = $user->getOrCreateCalendarToken();

        // Get the tenant domain from the current tenant
        $tenant = \Spatie\Multitenancy\Models\Tenant::current();
        $tenantDomain = $tenant?->domain ?? 'unknown';

        // Use a public base URL for the feed (can be ngrok URL in dev)
        $baseUrl = config('app.feed_url', config('app.url'));
        $feedUrl = "{$baseUrl}/api/v1/calendar-feed/{$tenantDomain}/{$token}";

        return response()->json([
            'url' => $feedUrl,
            'tenant_domain' => $tenantDomain,
            'instructions' => [
                'outlook' => 'Open Outlook → Agenda → Agenda toevoegen → Van internet → Plak de URL',
                'google' => 'Open Google Calendar → Andere agenda\'s → Via URL → Plak de URL',
                'apple' => 'Open Kalender → Archief → Nieuw agenda-abonnement → Plak de URL',
            ],
        ]);
    }

    /**
     * Regenerate the calendar token.
     */
    public function regenerateToken(Request $request)
    {
        $user = $request->user();
        $token = $user->generateCalendarToken();

        // Get the tenant domain from the current tenant
        $tenant = \Spatie\Multitenancy\Models\Tenant::current();
        $tenantDomain = $tenant?->domain ?? 'unknown';

        // Use a public base URL for the feed (can be ngrok URL in dev)
        $baseUrl = config('app.feed_url', config('app.url'));
        $feedUrl = "{$baseUrl}/api/v1/calendar-feed/{$tenantDomain}/{$token}";

        return response()->json([
            'url' => $feedUrl,
            'message' => 'Nieuwe URL gegenereerd. De oude URL werkt niet meer.',
        ]);
    }

    /**
     * Serve the iCal feed (public endpoint, authenticated via token).
     * Tenant is determined by the tenantDomain path parameter.
     */
    public function feed(string $tenantDomain, string $token)
    {
        // Find the tenant by domain
        $tenant = \Spatie\Multitenancy\Models\Tenant::where('domain', $tenantDomain)->first();

        if (!$tenant) {
            abort(404, 'Calendar feed not found');
        }

        // Make the tenant current to switch database connection
        $tenant->makeCurrent();

        // Now find the user in the tenant's database
        $user = User::where('calendar_token', $token)->first();

        if (!$user) {
            abort(404, 'Calendar feed not found');
        }

        // Get events for the next 90 days and past 30 days
        $start = Carbon::now()->subDays(30);
        $end = Carbon::now()->addDays(90);

        $events = CalendarEvent::where('user_id', $user->id)
            ->where('start_at', '<=', $end)
            ->where('end_at', '>=', $start)
            ->with(['account:id,name', 'contact:id,first_name,last_name'])
            ->orderBy('start_at')
            ->get();

        $ical = $this->generateIcal($events, $user);

        return response($ical, 200)
            ->header('Content-Type', 'text/calendar; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="calendar.ics"');
    }

    /**
     * Generate iCal content from events.
     */
    private function generateIcal($events, User $user): string
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//AVE CRM//Calendar//NL',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:AVE CRM - ' . $this->escapeIcal($user->name),
            'X-WR-TIMEZONE:Europe/Amsterdam',
        ];

        // Add timezone definition
        $lines[] = 'BEGIN:VTIMEZONE';
        $lines[] = 'TZID:Europe/Amsterdam';
        $lines[] = 'BEGIN:DAYLIGHT';
        $lines[] = 'TZOFFSETFROM:+0100';
        $lines[] = 'TZOFFSETTO:+0200';
        $lines[] = 'TZNAME:CEST';
        $lines[] = 'DTSTART:19700329T020000';
        $lines[] = 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU';
        $lines[] = 'END:DAYLIGHT';
        $lines[] = 'BEGIN:STANDARD';
        $lines[] = 'TZOFFSETFROM:+0200';
        $lines[] = 'TZOFFSETTO:+0100';
        $lines[] = 'TZNAME:CET';
        $lines[] = 'DTSTART:19701025T030000';
        $lines[] = 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU';
        $lines[] = 'END:STANDARD';
        $lines[] = 'END:VTIMEZONE';

        foreach ($events as $event) {
            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:' . $event->uid . '@avecrm';
            $lines[] = 'DTSTAMP:' . $this->formatDateTime($event->updated_at ?? $event->created_at);

            if ($event->all_day) {
                $lines[] = 'DTSTART;VALUE=DATE:' . $event->start_at->format('Ymd');
                $lines[] = 'DTEND;VALUE=DATE:' . $event->end_at->addDay()->format('Ymd');
            } else {
                $lines[] = 'DTSTART;TZID=Europe/Amsterdam:' . $event->start_at->format('Ymd\THis');
                $lines[] = 'DTEND;TZID=Europe/Amsterdam:' . $event->end_at->format('Ymd\THis');
            }

            $lines[] = 'SUMMARY:' . $this->escapeIcal($event->title);

            // Build description
            $description = [];
            if ($event->description) {
                $description[] = $event->description;
            }
            if ($event->account) {
                $description[] = 'Klant: ' . $event->account->name;
            }
            if ($event->contact) {
                $description[] = 'Contact: ' . $event->contact->first_name . ' ' . $event->contact->last_name;
            }
            if (!empty($description)) {
                $lines[] = 'DESCRIPTION:' . $this->escapeIcal(implode('\n', $description));
            }

            if ($event->location) {
                $lines[] = 'LOCATION:' . $this->escapeIcal($event->location);
            }

            // Map event type to category
            $category = match ($event->event_type) {
                'meeting' => 'MEETING',
                'call' => 'PHONE CALL',
                'interview' => 'INTERVIEW',
                'reminder' => 'REMINDER',
                default => 'APPOINTMENT',
            };
            $lines[] = 'CATEGORIES:' . $category;

            $lines[] = 'STATUS:CONFIRMED';
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines);
    }

    /**
     * Format datetime for iCal.
     */
    private function formatDateTime(Carbon $date): string
    {
        return $date->utc()->format('Ymd\THis\Z');
    }

    /**
     * Escape special characters for iCal format.
     */
    private function escapeIcal(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace(',', '\,', $text);
        $text = str_replace(';', '\;', $text);
        $text = str_replace("\n", '\n', $text);
        $text = str_replace("\r", '', $text);
        return $text;
    }
}

