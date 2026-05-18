<?php

namespace App\Http\Controllers;

use App\Models\AccountActivity;
use App\Models\Assignment;
use App\Models\CalendarEvent;
use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Opdrachtstatussen die niet meer als "lopend" tellen (NL + legacy EN). */
    private const CLOSED_ASSIGNMENT_STATUSES = [
        'aangenomen',
        'afgewezen',
        'administratief_voltooid',
        'voltooid',
        'opdracht_on_hold',
        'hired',
        'completed',
        'cancelled',
    ];

    private const CLOSED_CANDIDATE_STATUSES = ['rejected', 'hired', 'afgewezen', 'aangenomen'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        return response()->json([
            'interim_assignments' => $this->interimAssignments($today),
            'ongoing_assignments' => $this->ongoingAssignments(),
            'active_candidates' => $this->activeCandidates(),
            'today_events' => $this->todayEvents($user->id, $today),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function interimAssignments(Carbon $today): array
    {
        return Assignment::query()
            ->with(['account:id,uid,name'])
            ->whereNotIn('status', self::CLOSED_ASSIGNMENT_STATUSES)
            ->where(function ($q) {
                $q->whereRaw('LOWER(employment_type) = ?', ['interim'])
                    ->orWhereRaw('LOWER(employment_type) LIKE ?', ['%interim%']);
            })
            ->orderByRaw('end_date IS NULL')
            ->orderBy('end_date')
            ->orderBy('title')
            ->get()
            ->map(function (Assignment $assignment) use ($today) {
                $start = $assignment->start_date;
                $end = $assignment->end_date;

                $durationWeeks = null;
                if ($start && $end) {
                    $durationWeeks = (int) ceil($start->diffInDays($end) / 7);
                }

                $daysRemaining = null;
                $isEndingSoon = false;
                if ($end) {
                    $daysRemaining = $today->diffInDays($end, false);
                    $isEndingSoon = $daysRemaining >= 0 && $daysRemaining <= 14;
                }

                return [
                    'uid' => $assignment->uid,
                    'title' => $assignment->title,
                    'status' => $assignment->status,
                    'account' => $assignment->account ? [
                        'uid' => $assignment->account->uid,
                        'name' => $assignment->account->name,
                    ] : null,
                    'start_date' => $start?->format('Y-m-d'),
                    'end_date' => $end?->format('Y-m-d'),
                    'duration_weeks' => $durationWeeks,
                    'days_remaining' => $daysRemaining,
                    'is_ending_soon' => $isEndingSoon,
                    'is_overdue' => $end ? $end->lt($today) : false,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function ongoingAssignments(): array
    {
        $latestActivities = AccountActivity::query()
            ->with(['contact:id,uid,first_name,last_name'])
            ->whereNotNull('assignment_id')
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->unique('assignment_id')
            ->keyBy('assignment_id');

        return Assignment::query()
            ->with(['account:id,uid,name', 'recruiter:id,uid,name'])
            ->withCount([
                'candidates as active_candidates_count' => function ($q) {
                    $q->whereNotIn('assignment_contact.status', self::CLOSED_CANDIDATE_STATUSES);
                },
            ])
            ->whereNotIn('status', self::CLOSED_ASSIGNMENT_STATUSES)
            ->orderBy('title')
            ->get()
            ->map(function (Assignment $assignment) use ($latestActivities) {
                $lastActivity = $latestActivities->get($assignment->id);

                return [
                    'uid' => $assignment->uid,
                    'title' => $assignment->title,
                    'status' => $assignment->status,
                    'account' => $assignment->account ? [
                        'uid' => $assignment->account->uid,
                        'name' => $assignment->account->name,
                    ] : null,
                    'recruiter' => $assignment->recruiter ? [
                        'uid' => $assignment->recruiter->uid,
                        'name' => $assignment->recruiter->name,
                    ] : null,
                    'active_candidates_count' => $assignment->active_candidates_count,
                    'last_contact' => $lastActivity ? [
                        'date' => $lastActivity->date->format('Y-m-d'),
                        'type' => $lastActivity->type,
                        'description' => $lastActivity->description
                            ? mb_substr($lastActivity->description, 0, 120)
                            : null,
                        'contact_name' => $lastActivity->contact
                            ? trim($lastActivity->contact->first_name . ' ' . $lastActivity->contact->last_name)
                            : null,
                    ] : null,
                ];
            })
            ->sortByDesc(fn ($a) => $a['last_contact']['date'] ?? '0000-00-00')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function activeCandidates(): array
    {
        $rows = Assignment::query()
            ->with([
                'account:id,uid,name',
                'candidates' => function ($q) {
                    $q->wherePivotNotIn('status', self::CLOSED_CANDIDATE_STATUSES)
                        ->select([
                            'contacts.id',
                            'contacts.uid',
                            'contacts.first_name',
                            'contacts.last_name',
                            'contacts.company_role',
                            'contacts.current_company',
                        ]);
                },
            ])
            ->whereNotIn('status', self::CLOSED_ASSIGNMENT_STATUSES)
            ->get()
            ->flatMap(function (Assignment $assignment) {
                return $assignment->candidates->map(function (Contact $contact) use ($assignment) {
                    return [
                        'contact' => [
                            'uid' => $contact->uid,
                            'name' => trim($contact->first_name . ' ' . $contact->last_name),
                            'company_role' => $contact->company_role,
                            'current_company' => $contact->current_company,
                        ],
                        'assignment' => [
                            'uid' => $assignment->uid,
                            'title' => $assignment->title,
                        ],
                        'account' => $assignment->account ? [
                            'uid' => $assignment->account->uid,
                            'name' => $assignment->account->name,
                        ] : null,
                        'status' => $contact->pivot->status,
                        'status_updated_at' => Carbon::parse($contact->pivot->updated_at)->toIso8601String(),
                        '_sort' => $contact->pivot->updated_at,
                    ];
                });
            })
            ->sortByDesc('_sort')
            ->take(50)
            ->map(fn (array $row) => collect($row)->except('_sort')->all())
            ->values()
            ->all();

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function todayEvents(int $userId, Carbon $today): array
    {
        $start = $today->copy()->startOfDay();
        $end = $today->copy()->endOfDay();

        return CalendarEvent::query()
            ->with(['account:id,uid,name', 'contact:id,uid,first_name,last_name'])
            ->where('user_id', $userId)
            ->where('start_at', '<=', $end)
            ->where('end_at', '>=', $start)
            ->orderBy('start_at')
            ->get()
            ->map(function (CalendarEvent $event) {
                return [
                    'uid' => $event->uid,
                    'title' => $event->title,
                    'start_at' => $event->start_at->toIso8601String(),
                    'end_at' => $event->end_at->toIso8601String(),
                    'all_day' => $event->all_day,
                    'location' => $event->location,
                    'event_type' => $event->event_type,
                    'color' => $event->color,
                    'account_name' => $event->account?->name,
                    'contact_name' => $event->contact
                        ? trim($event->contact->first_name . ' ' . $event->contact->last_name)
                        : null,
                ];
            })
            ->values()
            ->all();
    }
}
