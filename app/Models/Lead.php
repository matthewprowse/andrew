<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $submitted_at
 */
class Lead extends Model
{
    protected $fillable = [
        'type',
        'name',
        'email',
        'subject',
        'message',
        'service_id',
        'custom_fields',
        'submitted_at',
        'anonymized_at',
    ];

    protected function casts(): array
    {
        return [
            'handled' => 'boolean',
            'submitted_at' => 'datetime',
            'anonymized_at' => 'datetime',
            'service_id' => 'integer',
            'custom_fields' => 'array',
        ];
    }

    /**
     * Breaks the link to the person's identity while keeping the row for
     * business reporting — a POPIA/GDPR-style "forget me" action, not a
     * hard delete. See docs/data-subject-requests.md.
     */
    public function anonymize(): void
    {
        $this->update([
            'name' => null,
            'email' => 'anonymized-'.$this->id.'@example.invalid',
            'subject' => null,
            'message' => null,
            'anonymized_at' => now(),
        ]);
    }
}
