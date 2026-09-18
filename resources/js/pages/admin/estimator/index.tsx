import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';

// Cleared for now — previously EstimatorLayout with a sub-sidebar across
// Home/Services/Destination Costs/Intra-Location Costs/City Service Rates/
// Cities/Catalogue Control (resources/js/layouts/estimator-layout.tsx). The
// sub-pages and their routes/controllers are untouched and still reachable
// directly; only this landing page and the nav into it were cleared, same
// treatment as admin/index.tsx.
export default function EstimatorIndex() {
    return <AdminWorkspaceLayout title="Estimator" />;
}
