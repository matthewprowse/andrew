import {
    TestimonialsManager,
    type TestimonialRecord,
} from '@/features/admin/testimonials/testimonials-manager';

type ServiceOption = { id: string; name: string };

export default function TestimonialsIndex({
    testimonials,
    services,
}: {
    testimonials: TestimonialRecord[];
    services: ServiceOption[];
}) {
    return (
        <TestimonialsManager testimonials={testimonials} services={services} />
    );
}
