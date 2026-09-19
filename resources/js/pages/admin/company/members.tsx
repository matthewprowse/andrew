import { useRef, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    BriefcaseBusiness,
    ShieldCheck,
    UserRound,
    UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Heading from '@/components/heading';
import {
    TeamManager,
    type TeamManagerHandle,
} from '@/features/admin/team/team-manager';
import {
    CareersManager,
    type Career,
    type CareersManagerHandle,
} from '@/features/admin/careers/careers-manager';
import {
    RolesTable,
    UsersTable,
    type CreateHandle,
    type RoleRecord,
    type UserRecord,
} from '@/features/admin/users/users-manager';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';
import { ADMIN_PAGE_DESCRIPTION } from '@/lib/admin-copy';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { TeamMemberAdminRecord } from '@/types/team';

type MembersProps = {
    members?: TeamMemberAdminRecord[];
    careers?: Career[];
    sections?: Record<string, string>;
    actions?: Record<string, string>;
    roles?: RoleRecord[];
    users?: UserRecord[];
};

const PAGE_DESCRIPTION = ADMIN_PAGE_DESCRIPTION;

function SectionSidebar({
    activeSection,
    canManageAccounts,
    members,
    careers,
    onSelect,
}: {
    activeSection: SectionKey;
    canManageAccounts: boolean;
    members?: TeamMemberAdminRecord[];
    careers?: Career[];
    onSelect: (section: SectionKey) => void;
}) {
    return (
        <SidebarProvider defaultOpen className="min-h-0 w-full">
            <Sidebar
                collapsible="none"
                variant="sidebar"
                className="sticky top-6 h-fit"
            >
                <SidebarContent>
                    <SidebarGroup className="p-0">
                        <SidebarMenu
                            className="gap-0.5"
                            style={{ rowGap: '0.125rem' }}
                        >
                            {members && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        type="button"
                                        isActive={
                                            activeSection === 'team-members'
                                        }
                                        onClick={() => onSelect('team-members')}
                                    >
                                        <UsersRound className="size-4" />
                                        <span>Team Members</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            {careers && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        type="button"
                                        isActive={
                                            activeSection === 'open-positions'
                                        }
                                        onClick={() =>
                                            onSelect('open-positions')
                                        }
                                    >
                                        <BriefcaseBusiness className="size-4" />
                                        <span>Positions</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            {canManageAccounts && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        type="button"
                                        isActive={activeSection === 'users'}
                                        onClick={() => onSelect('users')}
                                    >
                                        <UserRound className="size-4" />
                                        <span>Users</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            {canManageAccounts && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        type="button"
                                        isActive={activeSection === 'roles'}
                                        onClick={() => onSelect('roles')}
                                    >
                                        <ShieldCheck className="size-4" />
                                        <span>Permissions</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </SidebarProvider>
    );
}

type SectionKey = 'users' | 'team-members' | 'open-positions' | 'roles';
type SortDirection = 'asc' | 'desc';
type SortConfig = { key: string; direction: SortDirection };

const sortOptions: Record<SectionKey, { key: string; label: string }[]> = {
    'team-members': [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Job title' },
        { key: 'status', label: 'Status' },
        { key: 'sortOrder', label: 'Display order' },
    ],
    'open-positions': [
        { key: 'jobTitle', label: 'Job title' },
        { key: 'location', label: 'Location' },
        { key: 'status', label: 'Status' },
        { key: 'postedDate', label: 'Posted date' },
    ],
    users: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'roleName', label: 'Role' },
    ],
    roles: [
        { key: 'name', label: 'Name' },
        { key: 'userCount', label: 'Users' },
    ],
};

const defaultSorts: Record<SectionKey, SortConfig> = {
    'team-members': { key: 'sortOrder', direction: 'asc' },
    'open-positions': { key: 'postedDate', direction: 'desc' },
    users: { key: 'name', direction: 'asc' },
    roles: { key: 'name', direction: 'asc' },
};

function compareValues(left: unknown, right: unknown) {
    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }

    const leftText =
        typeof left === 'string' || typeof left === 'boolean'
            ? String(left)
            : '';
    const rightText =
        typeof right === 'string' || typeof right === 'boolean'
            ? String(right)
            : '';

    return leftText.localeCompare(rightText, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function sortRecords<T>(
    records: T[],
    getValue: (record: T, key: string) => unknown,
    sort: SortConfig,
) {
    return [...records].sort((left, right) => {
        const result = compareValues(
            getValue(left, sort.key),
            getValue(right, sort.key),
        );
        return sort.direction === 'asc' ? result : -result;
    });
}

export default function Members({
    members,
    careers,
    sections,
    actions,
    roles,
    users,
}: MembersProps) {
    const usersHandle = useRef<CreateHandle>(null);
    const teamHandle = useRef<TeamManagerHandle>(null);
    const careersHandle = useRef<CareersManagerHandle>(null);
    const rolesHandle = useRef<CreateHandle>(null);
    const canManageAccounts = Boolean(sections && roles && users);
    const displayCareers = careers?.map((career) => ({
        ...career,
        status: String(career.status) === 'Open' ? 'Live' : 'Draft',
    })) as Career[] | undefined;
    const [activeSection, setActiveSection] = useState<SectionKey>(
        members ? 'team-members' : careers ? 'open-positions' : 'users',
    );
    const [searches, setSearches] = useState<Record<SectionKey, string>>({
        'team-members': '',
        'open-positions': '',
        users: '',
        roles: '',
    });
    const [sorts, setSorts] =
        useState<Record<SectionKey, SortConfig>>(defaultSorts);

    const search = searches[activeSection];
    const sort = sorts[activeSection];
    const activeSortOptions = sortOptions[activeSection];
    const query = search.trim().toLowerCase();
    const filteredMembers = members
        ? sortRecords(
              members.filter((member) =>
                  [member.name, member.role, member.status, member.bio]
                      .join(' ')
                      .toLowerCase()
                      .includes(query),
              ),
              (member, key) => member[key as keyof TeamMemberAdminRecord],
              sort,
          )
        : undefined;
    const filteredCareers = displayCareers
        ? sortRecords(
              displayCareers.filter((career) =>
                  [
                      career.jobTitle,
                      career.location,
                      career.status,
                      career.description,
                  ]
                      .join(' ')
                      .toLowerCase()
                      .includes(query),
              ),
              (career, key) => career[key as keyof Career],
              sort,
          )
        : undefined;
    const filteredUsers = users
        ? sortRecords(
              users.filter((user) =>
                  [user.name, user.email, user.roleName]
                      .join(' ')
                      .toLowerCase()
                      .includes(query),
              ),
              (user, key) => user[key as keyof UserRecord],
              sort,
          )
        : undefined;
    const filteredRoles = roles
        ? sortRecords(
              roles.filter((role) =>
                  [role.name, role.description]
                      .join(' ')
                      .toLowerCase()
                      .includes(query),
              ),
              (role, key) => role[key as keyof RoleRecord],
              sort,
          )
        : undefined;

    function setSearch(value: string) {
        setSearches((current) => ({ ...current, [activeSection]: value }));
    }

    function setSort(key: string) {
        setSorts((current) => ({
            ...current,
            [activeSection]: {
                key,
                direction:
                    current[activeSection].key === key &&
                    current[activeSection].direction === 'asc'
                        ? 'desc'
                        : 'asc',
            },
        }));
    }

    const headerAction = (
        <div className="flex items-center gap-2">
            <Input
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-64"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="secondary">Sort</Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-56">
                    {activeSortOptions.map((option) => {
                        const selected = sort.key === option.key;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => setSort(option.key)}
                                className="hover:bg-accent hover:text-accent-foreground relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm select-none"
                            >
                                {option.label}
                                <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                                    {selected && sort.direction === 'asc' && (
                                        <ArrowUp className="size-3.5" />
                                    )}
                                    {selected && sort.direction === 'desc' && (
                                        <ArrowDown className="size-3.5" />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </PopoverContent>
            </Popover>
            {activeSection === 'users' && (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => usersHandle.current?.openCreate()}
                >
                    New User
                </Button>
            )}
            {activeSection === 'team-members' && (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => teamHandle.current?.openCreate()}
                >
                    New Team Member
                </Button>
            )}
            {activeSection === 'open-positions' && (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => careersHandle.current?.openCreate()}
                >
                    New Position
                </Button>
            )}
            {activeSection === 'roles' && (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => rolesHandle.current?.openCreate()}
                >
                    New Role
                </Button>
            )}
        </div>
    );

    return (
        <AdminWorkspaceLayout
            title="Team Members"
            description="Manage application access, the people shown on the public website, and open positions."
            headerAction={headerAction}
        >
            <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
                <SectionSidebar
                    activeSection={activeSection}
                    canManageAccounts={canManageAccounts}
                    members={members}
                    careers={displayCareers}
                    onSelect={setActiveSection}
                />

                <div className="min-w-0">
                    {activeSection === 'users' &&
                        canManageAccounts &&
                        roles &&
                        users && (
                            <>
                                <Heading
                                    title="Users"
                                    description={PAGE_DESCRIPTION}
                                    variant="large"
                                />
                                <UsersTable
                                    ref={usersHandle}
                                    roles={roles}
                                    users={filteredUsers ?? users}
                                    hideIntro
                                />
                            </>
                        )}

                    {activeSection === 'team-members' && members && (
                        <>
                            <Heading
                                title="Team Members"
                                description={PAGE_DESCRIPTION}
                                variant="large"
                            />
                            <TeamManager
                                ref={teamHandle}
                                members={filteredMembers ?? members}
                                hideToolbar
                            />
                        </>
                    )}

                    {activeSection === 'open-positions' && displayCareers && (
                        <>
                            <Heading
                                title="Positions"
                                description={PAGE_DESCRIPTION}
                                variant="large"
                            />
                            <CareersManager
                                ref={careersHandle}
                                careers={filteredCareers ?? displayCareers}
                                hideToolbar
                            />
                        </>
                    )}

                    {activeSection === 'roles' &&
                        canManageAccounts &&
                        sections &&
                        actions &&
                        roles && (
                            <>
                                <Heading
                                    title="Permissions"
                                    description={PAGE_DESCRIPTION}
                                    variant="large"
                                />
                                <RolesTable
                                    ref={rolesHandle}
                                    sections={sections}
                                    actions={actions}
                                    roles={filteredRoles ?? roles}
                                    hideIntro
                                />
                            </>
                        )}
                </div>
            </div>
        </AdminWorkspaceLayout>
    );
}
