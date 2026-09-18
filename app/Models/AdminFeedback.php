<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminFeedback extends Model
{
    /** Canonical set of feedback categories — kept small and fixed rather than free text so reporting stays meaningful. */
    public const TYPES = ['bug', 'feature', 'content_change', 'other'];

    /** Triage state — defaults to 'open' until a root admin marks it resolved. */
    public const STATUSES = ['open', 'resolved'];

    protected $fillable = ['user_id', 'type', 'status', 'message', 'page_url', 'user_agent'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<AdminFeedbackAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(AdminFeedbackAttachment::class);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'message' => $this->message,
            'pageUrl' => $this->page_url ?? '',
            'userAgent' => $this->user_agent ?? '',
            'userName' => $this->user->name ?? ($this->user_id ? 'Deleted user' : 'Unknown'),
            'userEmail' => $this->user->email ?? '',
            'createdAt' => $this->created_at?->toIso8601String() ?? '',
            'attachments' => $this->attachments->map(fn (AdminFeedbackAttachment $attachment) => $attachment->adminData())->values(),
        ];
    }
}
