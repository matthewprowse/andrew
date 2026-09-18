<x-mail::message>
# Your refund has been issued

Hi {{ $name ?: 'there' }},

We've refunded **{{ $amount }}** for **{{ $title }}**. Access to this resource has ended.

The refund can take a few business days to appear, depending on your payment method.

Order reference: {{ $reference }}

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
