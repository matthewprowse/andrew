<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('access-admin') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($this->route('role'))],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['sometimes', 'array:'.implode(',', $this->actionKeys())],
        ];

        foreach ($this->sectionKeys() as $key) {
            foreach ($this->actionKeys() as $action) {
                $rules["permissions.{$key}.{$action}"] = ['sometimes', 'boolean'];
            }
        }

        return $rules;
    }

    /**
     * Only known section keys survive — an unknown key can't be smuggled
     * into stored permissions.
     *
     * @return array<string, array<string, bool>>
     */
    public function permissionsForStorage(): array
    {
        /** @var array<string, mixed> $submitted */
        $submitted = (array) $this->input('permissions', []);

        $permissions = [];
        foreach ($this->sectionKeys() as $key) {
            $permissions[$key] = [];
            foreach ($this->actionKeys() as $action) {
                $permissions[$key][$action] = (bool) ($submitted[$key][$action] ?? false);
            }
        }

        return $permissions;
    }

    /** @return list<string> */
    private function sectionKeys(): array
    {
        return array_map('strval', array_keys(config('admin.sections', [])));
    }

    /** @return list<string> */
    private function actionKeys(): array
    {
        return array_map('strval', array_keys(config('admin.actions', [])));
    }
}
