import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaqManager } from '@/features/admin/faqs/faq-manager';
import { TestimonialsManager } from '@/features/admin/testimonials/testimonials-manager';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { FaqRecord } from '@/types/faq';
import type { TestimonialRecord } from '@/features/admin/testimonials/testimonials-manager';

type ReusableContentTab = 'testimonials' | 'faqs';

const TAB_VALUES: ReusableContentTab[] = ['testimonials', 'faqs'];

// LIB-05 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4 batch 4B): Testimonials
// and FAQs live under one Reusable Content workspace (the plan's §3.1 target
// IA), reusing the exact URL-backed-tab pattern already established on
// Company (/admin/company?tab=). Each tab keeps its own, independent
// permission section — testimonials is unaffected (same section, same
// public placement rules, same frozen-controller usage); FAQs are gated by
// `resources`, per the plan's §5 instruction to reuse existing
// source-specific permission keys rather than add a new config/admin.php
// section. A viewer can have one grant without the other.
const TAB_PERMISSION_SECTION: Record<ReusableContentTab, string> = {
    testimonials: 'testimonials',
    faqs: 'resources',
};

function tabFromUrl(
    url: string,
    availableTabs: ReusableContentTab[],
): ReusableContentTab {
    const queryString = url.split('?')[1] ?? '';
    const requested = new URLSearchParams(queryString).get(
        'tab',
    ) as ReusableContentTab | null;

    return requested && availableTabs.includes(requested)
        ? requested
        : availableTabs[0];
}

export default function ReusableContentIndex({
    testimonials,
    faqs,
    services,
}: {
    // Absent (not just empty) when the viewer's role can't view that
    // section — see AdminReusableContentController and NAV-06.
    testimonials?: TestimonialRecord[];
    faqs?: FaqRecord[];
    services?: { id: string; name: string }[];
}) {
    const { props, url } = usePage();
    const { adminPermissions } = props.auth;
    const availableTabs = TAB_VALUES.filter(
        (key) => adminPermissions[TAB_PERMISSION_SECTION[key]]?.view,
    );
    const [tab, setTab] = useState<ReusableContentTab>(() =>
        tabFromUrl(url, availableTabs),
    );

    function handleTabChange(value: string) {
        const next = value as ReusableContentTab;
        setTab(next);

        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        params.set('tab', next);
        const query = params.toString();
        window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${query ? `?${query}` : ''}`,
        );
    }

    if (availableTabs.length === 0) {
        return (
            <AdminWorkspaceLayout title="Reusable Content">
                <p className="text-muted-foreground text-sm">
                    No reusable content sections are available for your role.
                </p>
            </AdminWorkspaceLayout>
        );
    }

    return (
        <>
            <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList>
                    {adminPermissions.testimonials?.view && (
                        <TabsTrigger value="testimonials">
                            Testimonials
                        </TabsTrigger>
                    )}
                    {adminPermissions.resources?.view && (
                        <TabsTrigger value="faqs">FAQs</TabsTrigger>
                    )}
                </TabsList>
                {adminPermissions.testimonials?.view && testimonials && (
                    <TabsContent
                        value="testimonials"
                        className="grid gap-4 pt-4"
                    >
                        <TestimonialsManager
                            testimonials={testimonials}
                            services={services ?? []}
                        />
                    </TabsContent>
                )}
                {adminPermissions.resources?.view && faqs && (
                    <TabsContent value="faqs" className="grid gap-4 pt-4">
                        <FaqManager faqs={faqs} services={services ?? []} />
                    </TabsContent>
                )}
            </Tabs>
        </>
    );
}
