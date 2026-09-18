import { FaqManager } from '@/features/admin/faqs/faq-manager';
import type { FaqRecord } from '@/types/faq';

type ServiceOption = { id: string; name: string };

export default function FaqsIndex({
    faqs,
    services,
}: {
    faqs: FaqRecord[];
    services: ServiceOption[];
}) {
    return <FaqManager faqs={faqs} services={services} />;
}
