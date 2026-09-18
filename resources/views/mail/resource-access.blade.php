<x-mail::message>
# Your download is ready

Hi {{ $name }},

Thanks for requesting **{{ $title }}**. Click below to verify your email and access it.

<x-mail::button :url="$verifyUrl">
Access your download
</x-mail::button>

This link expires in 24 hours. If you didn't request this, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
