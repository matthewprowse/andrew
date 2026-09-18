<?php

return [
    // Capabilities are deliberately configuration-driven. Adding a new
    // capability here makes it available to every section, role editor, and
    // shared Inertia permission payload without changing the role schema.
    'actions' => [
        'view' => 'View',
        'create' => 'Create',
        'edit' => 'Edit',
        'publish' => 'Publish',
        'delete' => 'Delete',
    ],

    // Grant access to existing user IDs only; public registration cannot grant staff access.
    // These accounts are the permission system's root tier: they always have full access to
    // every section regardless of role, and only they can manage roles and other users' role
    // assignments — this avoids a role being able to grant itself more access than it started
    // with, and avoids a chicken-and-egg problem where no role exists yet to grant that access.
    'user_ids' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ADMIN_USER_IDS', '')),
    ))),

    // Canonical list of permission-able admin sections, keyed to match the real controllers/
    // routes/nav items they gate — not an open-ended, admin-invented list. Adding a new admin
    // area means adding it here too. 'view' governs whether the section (and its nav item) is
    // reachable at all; 'create' and 'edit' govern new and existing records;
    // 'publish' governs making staged content public; 'delete' governs destructive
    // actions. Not every section uses every capability yet.
    'sections' => [
        'pages' => 'Pages',
        'services' => 'Services',
        'team' => 'Team',
        'testimonials' => 'Testimonials',
        'careers' => 'Careers',
        'blog' => 'Insights',
        'locations' => 'Locations',
        'inquiries' => 'Inquiries',
        // view: see orders · edit: resend access links · delete: refunds and
        // forgetting a buyer (money-moving and destructive actions).
        'orders' => 'Orders',
        'analytics' => 'Analytics',
        'media' => 'Media Library',
        'resources' => 'Resources',
        'estimator' => 'Estimator',
        'settings' => 'Settings',
    ],
];
