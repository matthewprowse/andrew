<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CountryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        Country::create($this->validatedFields($request));

        return to_route('admin.locations');
    }

    public function update(Request $request, Country $country): RedirectResponse
    {
        $country->update($this->validatedFields($request, $country));

        return to_route('admin.locations');
    }

    /** @return array<string, mixed> */
    private function validatedFields(Request $request, ?Country $country = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('countries', 'slug')->ignore($country)],
            'region' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'sortOrder' => ['required', 'integer', 'min:0', 'max:1000000'],
            'status' => ['required', 'in:draft,published,archived'],
        ]);

        return ['name' => $data['name'], 'slug' => $data['slug'], 'region' => $data['region'] ?? null,
            'description' => $data['description'] ?? null, 'sort_order' => $data['sortOrder'],
            'status' => (request()->user()?->canAdmin('locations', 'publish') ?? false) ? $data['status'] : 'draft'];
    }
}
