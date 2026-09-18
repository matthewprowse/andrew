import { ServicesManager } from '@/features/admin/services/services-manager';
import type { ServiceRecord } from '@/types/service';
import type { ResourceItemAdminRecord } from '@/types/resource';

export default function ServicesIndex({
    services,
    resourceOptions,
}: {
    services: ServiceRecord[];
    resourceOptions: ResourceItemAdminRecord[];
}) {
    return (
        <ServicesManager
            services={services}
            resourceOptions={resourceOptions}
        />
    );
}
