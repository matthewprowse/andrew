import { ResourcesManager } from '@/features/admin/resources/resources-manager';
import type { ResourceItemAdminRecord, ResourceLayout } from '@/types/resource';

type ServiceOption = { id: string; name: string };

export default function ResourcesIndex({
    category,
    layout,
    items,
    services,
}: {
    category: string;
    layout: ResourceLayout;
    items: ResourceItemAdminRecord[];
    services: ServiceOption[];
}) {
    return (
        <ResourcesManager
            category={category}
            layout={layout}
            items={items}
            services={services}
        />
    );
}
