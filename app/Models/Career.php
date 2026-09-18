<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $posted_date
 */
class Career extends Model
{
    protected $fillable = ['job_title', 'description', 'location', 'status', 'posted_date'];

    protected function casts(): array
    {
        return ['posted_date' => 'date'];
    }

    /** @return array<string, string> */
    public function adminData(): array
    {
        return ['id' => (string) $this->id, 'jobTitle' => $this->job_title, 'description' => $this->description,
            'location' => $this->location, 'status' => ucfirst($this->status), 'postedDate' => $this->posted_date->format('Y-m-d')];
    }
}
