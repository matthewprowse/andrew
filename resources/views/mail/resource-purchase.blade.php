<x-mail::message>
@if ($resent)
# Here's your access link
@else
# Thanks for your purchase
@endif

Hi {{ $name ?: 'there' }},

@if ($resent)
Here's a new link to access **{{ $title }}**.
@else
Payment received: **{{ $amount }}** for **{{ $title }}**.
@endif

<x-mail::button :url="$accessUrl">
Access {{ $title }}
</x-mail::button>

This link expires in {{ $days }} days. Your access doesn't expire: you can request a new link at any time from the resource page using this email address.

Order reference: {{ $reference }}

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
