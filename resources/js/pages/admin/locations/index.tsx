import { usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CountriesManager,
    type Country,
    type CountriesManagerHandle,
} from '@/features/admin/locations/countries-manager';
import {
    LocationsManager,
    type Location,
    type LocationsManagerHandle,
} from '@/features/admin/locations/locations-manager';
import { PageContentManager } from '@/features/admin/pages/page-content-manager';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import type { PageEditorProps } from '@/types/page-revision';

type LocationsTab = 'offices' | 'countries' | 'page-copy';

export default function LocationsIndex({
    locations,
    countries,
    pageContent,
}: {
    locations: Location[];
    countries: Country[];
    // CMS-04: absent when the viewer lacks the `pages` permission — this tab
    // is gated separately from the `locations` permission that already
    // gates the whole /admin/locations route (see LocationsController).
    pageContent?: PageEditorProps;
}) {
    const { props } = usePage();
    const { adminPermissions } = props.auth;
    const [tab, setTab] = useState<LocationsTab>('offices');
    const locationsHandle = useRef<LocationsManagerHandle>(null);
    const countriesHandle = useRef<CountriesManagerHandle>(null);

    return (
        <AdminWorkspaceLayout
            title="Locations"
            headerAction={
                tab === 'offices' ? (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => locationsHandle.current?.openCreate()}
                    >
                        New Location
                    </Button>
                ) : tab === 'countries' ? (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => countriesHandle.current?.openCreate()}
                    >
                        New Country
                    </Button>
                ) : undefined
            }
        >
            <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as LocationsTab)}
            >
                <TabsList>
                    <TabsTrigger value="offices">Offices</TabsTrigger>
                    <TabsTrigger value="countries">Countries</TabsTrigger>
                    {adminPermissions.pages?.view && (
                        <TabsTrigger value="page-copy">Page Copy</TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="offices" className="grid gap-6 pt-4">
                    <LocationsManager
                        ref={locationsHandle}
                        locations={locations}
                    />
                </TabsContent>
                <TabsContent value="countries" className="grid gap-6 pt-4">
                    <CountriesManager
                        ref={countriesHandle}
                        countries={countries}
                    />
                </TabsContent>
                {adminPermissions.pages?.view && pageContent && (
                    <TabsContent value="page-copy" className="pt-4">
                        <PageContentManager slug="locations" {...pageContent} />
                    </TabsContent>
                )}
            </Tabs>
        </AdminWorkspaceLayout>
    );
}
