import { useCallback, useState } from 'react';
import type { Errors, VisitOptions } from '@inertiajs/core';

export type AdminValidationErrors = Record<string, string>;

type Visit = (options: VisitOptions) => void;

export function useAdminMutation() {
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<AdminValidationErrors>({});

    const run = useCallback((visit: Visit, options: VisitOptions = {}) => {
        setProcessing(true);
        setErrors({});

        visit({
            preserveScroll: true,
            ...options,
            onError: (validationErrors: Errors) => {
                setErrors(validationErrors as AdminValidationErrors);
                options.onError?.(validationErrors);
            },
            onFinish: (visit) => {
                setProcessing(false);
                options.onFinish?.(visit);
            },
        });
    }, []);

    const clearErrors = useCallback(() => setErrors({}), []);

    return { processing, errors, setErrors, clearErrors, run };
}
