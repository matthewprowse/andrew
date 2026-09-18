import AdminLayout from '@/layouts/admin-layout';

interface AdminSectionProps {
    title: string;
}

export default function AdminSection({ title }: AdminSectionProps) {
    return <AdminLayout title={title} />;
}
