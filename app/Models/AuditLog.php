<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Immutable record of who did what to which piece of content, for the
 * accountability the plan calls for around deletions and anonymization.
 * Never updated or deleted once written.
 */
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['actor_id', 'action', 'subject_type', 'subject_id', 'context'];

    protected function casts(): array
    {
        return ['context' => 'array', 'created_at' => 'datetime'];
    }

    /** @param  array<string, mixed>  $context */
    public static function record(string $action, string $subjectType, int $subjectId, array $context = []): self
    {
        return self::create([
            'actor_id' => Auth::id(),
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'context' => $context,
            'created_at' => now(),
        ]);
    }
}
