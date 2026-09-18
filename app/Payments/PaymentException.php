<?php

namespace App\Payments;

use RuntimeException;

/** A payment action that could not be completed; the message is safe to show staff. */
class PaymentException extends RuntimeException {}
