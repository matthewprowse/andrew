<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveRoleRequest;
use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;

class AdminRoleController extends Controller
{
    public function store(SaveRoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'permissions' => $request->permissionsForStorage(),
        ]);

        AuditLog::record('created', 'role', $role->id, ['name' => $role->name]);

        return redirect('/admin/company/members');
    }

    public function update(SaveRoleRequest $request, Role $role): RedirectResponse
    {
        $role->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'permissions' => $request->permissionsForStorage(),
        ]);

        AuditLog::record('updated', 'role', $role->id, ['name' => $role->name]);

        return redirect('/admin/company/members');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->users()->exists()) {
            return back()->withErrors(['role' => 'This role is still assigned to users and cannot be deleted.']);
        }

        AuditLog::record('deleted', 'role', $role->id, ['name' => $role->name]);
        $role->delete();

        return redirect('/admin/company/members');
    }
}
