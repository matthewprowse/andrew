import { useHttp } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { type FormEvent, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import estimatorAccess from '@/routes/estimator/access';

const CODE_LENGTH = 6;

type Step = 'email' | 'code';

function EmailStep({ onSubmitted }: { onSubmitted: () => void }) {
    const { data, setData, submit, processing, errors } = useHttp<{
        email: string;
    }>(estimatorAccess.store(), { email: '' });

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        submit({ onSuccess: onSubmitted }).catch(() => {});
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2">
                <Label htmlFor="estimator-email">Email Address</Label>
                <Input
                    id="estimator-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    aria-invalid={!!errors.email}
                />
                <InputError message={errors.email} />
            </div>

            <Button type="submit" disabled={processing} className="w-full">
                {processing && <Spinner className="mr-2" />}
                Send Code
            </Button>
        </form>
    );
}

function CodeStep({ onVerified }: { onVerified: () => void }) {
    const [code, setCode] = useState('');
    const [checking, setChecking] = useState(false);

    const handleVerify = (): void => {
        setChecking(true);

        // Mockup only — any complete code is accepted, nothing is checked server-side yet.
        setTimeout(onVerified, 500);
    };

    return (
        <div className="flex flex-col items-center gap-5">
            <InputOTP
                id="estimator-code"
                maxLength={CODE_LENGTH}
                onChange={setCode}
                disabled={checking}
                pattern={REGEXP_ONLY_DIGITS}
                autoFocus
            >
                <InputOTPGroup>
                    {Array.from({ length: CODE_LENGTH }, (_, index) => (
                        <InputOTPSlot key={index} index={index} />
                    ))}
                </InputOTPGroup>
            </InputOTP>

            <Button
                type="button"
                className="w-full"
                disabled={checking || code.length < CODE_LENGTH}
                onClick={handleVerify}
            >
                {checking && <Spinner className="mr-2" />}
                Verify
            </Button>
        </div>
    );
}

const stepCopy: Record<Step, { title: string; description: string }> = {
    email: {
        title: 'Unlock The Cost Calculator',
        description:
            "Pop In Your Email And We'll Send A One-Time Code To Access The Estimator.",
    },
    code: {
        title: 'Enter Your Code',
        description: 'Enter The 6-Digit Code We Sent You.',
    },
};

type EstimatorAccessDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onVerified: () => void;
};

export function EstimatorAccessDialog({
    open,
    onOpenChange,
    onVerified,
}: EstimatorAccessDialogProps) {
    const [step, setStep] = useState<Step>('email');

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            setStep('email');
        }

        onOpenChange(nextOpen);
    };

    const handleVerified = (): void => {
        onVerified();
        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{stepCopy[step].title}</DialogTitle>
                    <DialogDescription>
                        {stepCopy[step].description}
                    </DialogDescription>
                </DialogHeader>

                {step === 'email' ? (
                    <EmailStep onSubmitted={() => setStep('code')} />
                ) : (
                    <CodeStep onVerified={handleVerified} />
                )}
            </DialogContent>
        </Dialog>
    );
}
