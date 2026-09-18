import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { PageMeta } from '@/components/page-meta';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type OrderSummary = {
    reference: string;
    status: 'pending' | 'paid' | 'refunded' | 'cancelled';
    amount: string;
    email: string;
    resourceTitle: string;
    resourceUrl: string;
};

type Outcome =
    | 'completed'
    | 'already_paid'
    | 'failed'
    | 'not_pending'
    | 'cancelled';

type CheckoutProps =
    | { mode: 'test'; order: OrderSummary; payUrl: string; cancelUrl: string }
    | { mode: 'result'; order: OrderSummary; outcome: Outcome };

function resultCopy(
    outcome: Outcome,
    order: OrderSummary,
): { title: string; body: string } {
    switch (outcome) {
        case 'completed':
            return {
                title: 'Payment received',
                body: `We've emailed an access link for ${order.resourceTitle} to ${order.email}.`,
            };
        case 'already_paid':
            return {
                title: 'You already have access',
                body: `You weren't charged again. We've emailed a new access link to ${order.email}.`,
            };
        case 'failed':
            return {
                title: "Payment didn't go through",
                body: 'No money was taken. You can try again from the resource page.',
            };
        case 'cancelled':
            return {
                title: 'Checkout cancelled',
                body: 'No money was taken.',
            };
        case 'not_pending':
            if (order.status === 'paid') {
                return {
                    title: 'This order is already paid',
                    body: `Check ${order.email} for your access link, or request a new one from the resource page.`,
                };
            }
            if (order.status === 'refunded') {
                return {
                    title: 'This order was refunded',
                    body: 'Access to this resource has ended.',
                };
            }
            return {
                title: 'This checkout is no longer open',
                body: 'Start again from the resource page.',
            };
    }
}

export default function Checkout(props: CheckoutProps) {
    const { order } = props;
    const [processing, setProcessing] = useState(false);

    function submit(url: string) {
        setProcessing(true);
        router.post(url, {}, { onFinish: () => setProcessing(false) });
    }

    const copy =
        props.mode === 'result' ? resultCopy(props.outcome, order) : null;

    return (
        <>
            <PageMeta
                title={copy?.title ?? 'Checkout'}
                description={`Order ${order.reference}`}
                noindex
            />
            <SiteHeader />
            <main className="mx-auto grid w-full max-w-lg gap-6 px-6 py-16 md:py-24">
                {props.mode === 'test' ? (
                    <>
                        <div className="grid gap-2">
                            <p className="text-muted-foreground text-sm">
                                Checkout
                            </p>
                            <h1 className="text-3xl font-semibold text-balance">
                                {order.resourceTitle}
                            </h1>
                        </div>
                        <Alert>
                            <AlertTitle>Test payment</AlertTitle>
                            <AlertDescription>
                                No money is taken. This page stands in for
                                PayPal until it's connected.
                            </AlertDescription>
                        </Alert>
                    </>
                ) : (
                    <div className="grid gap-2">
                        <h1 className="text-3xl font-semibold text-balance">
                            {copy?.title}
                        </h1>
                        <p className="text-muted-foreground">{copy?.body}</p>
                    </div>
                )}

                <Card>
                    <CardContent>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">Resource</dt>
                            <dd>{order.resourceTitle}</dd>
                            <dt className="text-muted-foreground">Order</dt>
                            <dd className="tabular-nums">{order.reference}</dd>
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="truncate">{order.email}</dd>
                            <dt className="text-muted-foreground">Total</dt>
                            <dd className="font-medium tabular-nums">
                                {order.amount}
                            </dd>
                        </dl>
                    </CardContent>
                </Card>

                {props.mode === 'test' ? (
                    <div className="flex flex-wrap gap-3">
                        <Button
                            disabled={processing}
                            onClick={() => submit(props.payUrl)}
                        >
                            {processing ? 'Processing…' : `Pay ${order.amount}`}
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={() => submit(props.cancelUrl)}
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button asChild variant="secondary" className="w-fit">
                        <Link href={order.resourceUrl}>Back to resources</Link>
                    </Button>
                )}
            </main>
            <SiteFooter />
        </>
    );
}
