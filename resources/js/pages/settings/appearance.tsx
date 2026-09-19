import { Head } from "@inertiajs/react";
import AppearanceTabs from "@/components/appearance-tabs";
import Heading from "@/components/heading";
import { edit as editAppearance } from "@/routes/appearance";

export default function Appearance({ embedded = false }: { embedded?: boolean }) {
    return (
        <>
            {!embedded && <Head title="Account Settings" />}

            <div className="space-y-6">
                {!embedded && (
                    <Heading
                        as="h1"
                        variant="large"
                        title="Appearance"
                        description="Choose how your account looks and feels"
                    />
                )}
                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: "Appearance settings",
            href: editAppearance(),
        },
    ],
};
