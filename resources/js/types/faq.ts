/**
 * The new FAQ store (LIB-06, docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4
 * 4B) — App\Models\Faq::adminData().
 */
export type FaqRecord = {
    id: string;
    question: string;
    answer: string;
    serviceId: string | null;
    serviceIds: string[];
    serviceNames: string[];
    serviceName?: string;
    status: 'Draft' | 'Live';
    reviewDate: string | null;
    updatedAt: string;
};
