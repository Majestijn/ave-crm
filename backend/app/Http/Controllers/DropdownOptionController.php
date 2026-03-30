<?php

namespace App\Http\Controllers;

use App\Models\DropdownOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DropdownOptionController extends Controller
{
    public function index(): JsonResponse
    {
        $options = DropdownOption::orderBy('type')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('type');

        return response()->json($options);
    }

    public function show(string $type): JsonResponse
    {
        $options = DropdownOption::ofType($type)
            ->orderBy('sort_order')
            ->get();

        return response()->json($options);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:64',
            'value' => 'nullable|string|max:255',
            'label' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $value = isset($validated['value']) && trim((string) $validated['value']) !== ''
            ? trim($validated['value'])
            : DropdownOption::uniqueValueFromLabel($validated['type'], $validated['label']);

        if (DropdownOption::ofType($validated['type'])->where('value', $value)->exists()) {
            return response()->json([
                'message' => 'Er bestaat al een optie met deze interne waarde voor dit type.',
                'errors' => ['value' => ['Deze waarde is al in gebruik.']],
            ], 422);
        }

        $maxSort = DropdownOption::ofType($validated['type'])->max('sort_order') ?? -1;

        $option = DropdownOption::create([
            'type' => $validated['type'],
            'value' => $value,
            'label' => $validated['label'],
            'color' => $validated['color'] ?? null,
            'sort_order' => $maxSort + 1,
            'is_active' => true,
        ]);

        return response()->json($option, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $option = DropdownOption::findOrFail($id);

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:255',
            'color' => 'nullable|string|max:20',
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $option->update($validated);

        return response()->json($option);
    }

    public function destroy(int $id): JsonResponse
    {
        $option = DropdownOption::findOrFail($id);
        $option->delete();

        return response()->json(['message' => 'Optie verwijderd']);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:64',
            'order' => 'required|array',
            'order.*' => 'integer',
        ]);

        foreach ($validated['order'] as $index => $id) {
            DropdownOption::where('id', $id)
                ->where('type', $validated['type'])
                ->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Volgorde bijgewerkt']);
    }
}
