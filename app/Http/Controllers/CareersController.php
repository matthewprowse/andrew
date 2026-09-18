<?php

namespace App\Http\Controllers;

use App\Models\Career;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CareersController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        Career::create($this->validatedFields($request));

        return redirect('/admin/company/members');
    }

    public function update(Request $request, Career $career): RedirectResponse
    {
        $career->update($this->validatedFields($request));

        return redirect('/admin/company/members');
    }

    /** @return array<string, string> */
    private function validatedFields(Request $request): array
    {
        $data = $request->validate([
            'jobTitle' => ['required', 'string', 'max:255'], 'description' => ['required', 'string', 'max:20000'],
            'location' => ['required', 'string', 'max:255'], 'status' => ['required', 'in:Draft,Live,Open,Closed'],
            'postedDate' => ['required', 'date_format:Y-m-d'],
        ]);

        return ['job_title' => $data['jobTitle'], 'description' => $data['description'], 'location' => $data['location'],
            'status' => (request()->user()?->canAdmin('careers', 'publish') ?? false)
                && in_array($data['status'], ['Live', 'Open'], true) ? 'open' : 'closed', 'posted_date' => $data['postedDate']];
    }
}
