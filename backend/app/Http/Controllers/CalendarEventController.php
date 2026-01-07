<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Account;
use App\Models\Assignment;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CalendarEventController extends Controller
{
    /**
     * Get all calendar events for the current user within a date range.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start' => 'required|date',
            'end' => 'required|date|after:start',
            'user_id' => 'nullable|integer',
        ]);

        $query = CalendarEvent::query()
            ->with(['user:id,name', 'account:id,uid,name', 'contact:id,uid,first_name,last_name'])
            ->where('start_at', '<=', $validated['end'])
            ->where('end_at', '>=', $validated['start']);

        // Filter by user if specified
        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        $events = $query->orderBy('start_at')->get();

        // Transform to FullCalendar format
        $formattedEvents = $events->map(function ($event) {
            return [
                'id' => $event->uid,
                'title' => $event->title,
                'start' => $event->start_at->toIso8601String(),
                'end' => $event->end_at->toIso8601String(),
                'allDay' => $event->all_day,
                'backgroundColor' => $event->color ?? $this->getDefaultColor($event->event_type),
                'borderColor' => $event->color ?? $this->getDefaultColor($event->event_type),
                'extendedProps' => [
                    'description' => $event->description,
                    'location' => $event->location,
                    'event_type' => $event->event_type,
                    'user_id' => $event->user_id,
                    'user_name' => $event->user?->name,
                    'account_id' => $event->account_id,
                    'account_uid' => $event->account?->uid,
                    'account_name' => $event->account?->name,
                    'assignment_id' => $event->assignment_id,
                    'contact_id' => $event->contact_id,
                    'contact_uid' => $event->contact?->uid,
                    'contact_name' => $event->contact ? $event->contact->first_name . ' ' . $event->contact->last_name : null,
                ],
            ];
        });

        return response()->json($formattedEvents);
    }

    /**
     * Store a new calendar event.
     */
    public function store(Request $request): JsonResponse
    {
        $auth = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
            'all_day' => 'boolean',
            'account_uid' => 'nullable|string',
            'assignment_id' => 'nullable|integer',
            'contact_uid' => 'nullable|string',
            'event_type' => 'nullable|string|in:meeting,call,interview,reminder,other',
            'color' => 'nullable|string|max:20',
        ]);

        // Resolve UIDs to IDs
        $accountId = null;
        if (!empty($validated['account_uid'])) {
            $account = Account::where('uid', $validated['account_uid'])->first();
            $accountId = $account?->id;
        }

        $contactId = null;
        if (!empty($validated['contact_uid'])) {
            $contact = Contact::where('uid', $validated['contact_uid'])->first();
            $contactId = $contact?->id;
        }

        $event = CalendarEvent::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? null,
            'start_at' => $validated['start_at'],
            'end_at' => $validated['end_at'],
            'all_day' => $validated['all_day'] ?? false,
            'user_id' => $auth->id,
            'account_id' => $accountId,
            'assignment_id' => $validated['assignment_id'] ?? null,
            'contact_id' => $contactId,
            'event_type' => $validated['event_type'] ?? 'meeting',
            'color' => $validated['color'] ?? null,
        ]);

        $event->load(['user:id,name', 'account:id,uid,name', 'contact:id,uid,first_name,last_name']);

        return response()->json([
            'id' => $event->uid,
            'title' => $event->title,
            'start' => $event->start_at->toIso8601String(),
            'end' => $event->end_at->toIso8601String(),
            'allDay' => $event->all_day,
            'backgroundColor' => $event->color ?? $this->getDefaultColor($event->event_type),
            'borderColor' => $event->color ?? $this->getDefaultColor($event->event_type),
            'extendedProps' => [
                'description' => $event->description,
                'location' => $event->location,
                'event_type' => $event->event_type,
                'user_id' => $event->user_id,
                'user_name' => $event->user?->name,
                'account_uid' => $event->account?->uid,
                'account_name' => $event->account?->name,
                'contact_uid' => $event->contact?->uid,
                'contact_name' => $event->contact ? $event->contact->first_name . ' ' . $event->contact->last_name : null,
            ],
        ], 201);
    }

    /**
     * Display the specified event.
     */
    public function show(string $uid): JsonResponse
    {
        $event = CalendarEvent::where('uid', $uid)
            ->with(['user:id,name', 'account:id,uid,name', 'contact:id,uid,first_name,last_name'])
            ->firstOrFail();

        return response()->json([
            'uid' => $event->uid,
            'title' => $event->title,
            'description' => $event->description,
            'location' => $event->location,
            'start_at' => $event->start_at->toIso8601String(),
            'end_at' => $event->end_at->toIso8601String(),
            'all_day' => $event->all_day,
            'user_id' => $event->user_id,
            'user' => $event->user ? [
                'id' => $event->user->id,
                'name' => $event->user->name,
            ] : null,
            'account' => $event->account ? [
                'uid' => $event->account->uid,
                'name' => $event->account->name,
            ] : null,
            'contact' => $event->contact ? [
                'uid' => $event->contact->uid,
                'name' => $event->contact->first_name . ' ' . $event->contact->last_name,
            ] : null,
            'event_type' => $event->event_type,
            'color' => $event->color,
        ]);
    }

    /**
     * Update the specified event.
     */
    public function update(Request $request, string $uid): JsonResponse
    {
        $event = CalendarEvent::where('uid', $uid)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_at' => 'sometimes|required|date',
            'end_at' => 'sometimes|required|date',
            'all_day' => 'boolean',
            'account_uid' => 'nullable|string',
            'assignment_id' => 'nullable|integer',
            'contact_uid' => 'nullable|string',
            'event_type' => 'nullable|string|in:meeting,call,interview,reminder,other',
            'color' => 'nullable|string|max:20',
        ]);

        // Handle account_uid to account_id conversion
        if (array_key_exists('account_uid', $validated)) {
            if ($validated['account_uid']) {
                $account = Account::where('uid', $validated['account_uid'])->first();
                $validated['account_id'] = $account?->id;
            } else {
                $validated['account_id'] = null;
            }
            unset($validated['account_uid']);
        }

        // Handle contact_uid to contact_id conversion
        if (array_key_exists('contact_uid', $validated)) {
            if ($validated['contact_uid']) {
                $contact = Contact::where('uid', $validated['contact_uid'])->first();
                $validated['contact_id'] = $contact?->id;
            } else {
                $validated['contact_id'] = null;
            }
            unset($validated['contact_uid']);
        }

        $event->fill($validated);
        $event->save();

        $event->load(['user:id,name', 'account:id,uid,name', 'contact:id,uid,first_name,last_name']);

        return response()->json([
            'id' => $event->uid,
            'title' => $event->title,
            'start' => $event->start_at->toIso8601String(),
            'end' => $event->end_at->toIso8601String(),
            'allDay' => $event->all_day,
            'backgroundColor' => $event->color ?? $this->getDefaultColor($event->event_type),
            'borderColor' => $event->color ?? $this->getDefaultColor($event->event_type),
            'extendedProps' => [
                'description' => $event->description,
                'location' => $event->location,
                'event_type' => $event->event_type,
                'user_id' => $event->user_id,
                'user_name' => $event->user?->name,
                'account_uid' => $event->account?->uid,
                'account_name' => $event->account?->name,
                'contact_uid' => $event->contact?->uid,
                'contact_name' => $event->contact ? $event->contact->first_name . ' ' . $event->contact->last_name : null,
            ],
        ]);
    }

    /**
     * Delete the specified event.
     */
    public function destroy(string $uid): JsonResponse
    {
        $event = CalendarEvent::where('uid', $uid)->firstOrFail();
        $event->delete();

        return response()->json(['message' => 'Event verwijderd']);
    }

    /**
     * Get default color based on event type.
     */
    private function getDefaultColor(string $eventType): string
    {
        return match ($eventType) {
            'meeting' => '#818cf8',    // Indigo/purple
            'call' => '#38bdf8',       // Sky blue
            'interview' => '#a78bfa',  // Violet
            'reminder' => '#fb923c',   // Orange
            'other' => '#94a3b8',      // Slate
            default => '#818cf8',
        };
    }
}

