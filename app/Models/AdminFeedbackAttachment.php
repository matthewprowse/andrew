<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AdminFeedbackAttachment extends Model
{
    protected $fillable = ['admin_feedback_id', 'file_path', 'file_name', 'mime_type', 'size'];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    /** @return BelongsTo<AdminFeedback, $this> */
    public function feedback(): BelongsTo
    {
        return $this->belongsTo(AdminFeedback::class, 'admin_feedback_id');
    }

    public function url(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'fileName' => $this->file_name,
            'url' => $this->url(),
        ];
    }
}
