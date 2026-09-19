<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignRoleRequest;
use App\Http\Requests\CreateAdminUserRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\AdminOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/users/index', [
            'sections' => config('admin.sections'),
            'actions' => config('admin.actions'),
            'roles' => AdminOptions::roles(),
            'users' => AdminOptions::users(),
        ]);
    }

    public function store(CreateAdminUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make(Str::random(40)),
            'role_id' => $data['role_id'],
        ]);

        Password::sendResetLink(['email' => $user->email]);

        AuditLog::record('created', 'user', $user->id, ['email' => $user->email]);

        return redirect('/admin/company/members');
    }

    public function assignRole(AssignRoleRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $users = User::whereIn('id', $data['user_ids'])->get();
        foreach ($users as $user) {
            $user->update(['role_id' => $data['role_id']]);
            AuditLog::record('role_assigned', 'user', $user->id, ['email' => $user->email, 'role_id' => $data['role_id']]);
        }

        return redirect('/admin/company/members');
    }
}
