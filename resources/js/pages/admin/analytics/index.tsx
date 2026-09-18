import {
    AnalyticsFilters,
    AnalyticsManager,
    type AnalyticsProps,
} from '@/features/admin/analytics/analytics-manager';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';

export default function AnalyticsIndex(props: AnalyticsProps) {
    return (
        <AdminWorkspaceLayout
            title="Analytics"
            headerAction={<AnalyticsFilters {...props} />}
        >
            <AnalyticsManager {...props} />
        </AdminWorkspaceLayout>
    );
}
