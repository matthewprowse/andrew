<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMember extends Model
{
    protected $fillable = ['name', 'role', 'bio', 'photo_media_id', 'sort_order', 'status', 'published_at'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'published_at' => 'datetime'];
    }

    /** @return BelongsTo<Media, $this> */
    public function photo(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'photo_media_id');
    }

    /** @return Builder<static> */
    public static function publiclyVisible(): Builder
    {
        return static::query()->where('status', 'published');
    }

    /** @return array<string, mixed> */
    public function adminData(): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'bio' => $this->bio ?? '',
            'photo' => $this->photo ? ['id' => (string) $this->photo->id, 'url' => $this->photo->url(), 'fileName' => $this->photo->file_name] : null,
            'sortOrder' => $this->sort_order,
            'status' => ucfirst($this->status),
        ];
    }

    /** @return array<string, mixed> */
    public function publicData(): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'bio' => $this->bio ?? '',
            'photoUrl' => $this->photo?->url() ?? '',
            'photoAlt' => $this->photo?->alt_text ?: "{$this->name}, {$this->role}",
        ];
    }
}
