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
            'value' => 'required|string|max:255',
            'label' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $maxSort = DropdownOption::ofType($validated['type'])->max('sort_order') ?? -1;

        $option = DropdownOption::create([
            ...$validated,
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
