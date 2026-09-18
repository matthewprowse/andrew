import { useImperativeHandle, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AdminWorkspaceLayout from '@/layouts/admin-workspace-layout';

export type CreateHandle = { openCreate: () => void };

export type SectionPermissions = Record<string, boolean>;

export type RoleRecord = {
    id: number;
    name: string;
    description: string;
    permissions: Record<string, SectionPermissions>;
    userCount: number;
};

export type UserRecord = {
    id: number;
    name: string;
    email: string;
    roleId: number | null;
    roleName: string | null;
    isRootAdmin: boolean;
};

export type UsersManagerProps = {
    sections: Record<string, string>;
    actions: Record<string, string>;
    roles: RoleRecord[];
    users: UserRecord[];
};

function emptyPermissions(
    sections: Record<string, string>,
    actions: Record<string, string>,
): Record<string, SectionPermissions> {
    return Object.fromEntries(
        Object.keys(sections).map((key) => [
            key,
            Object.fromEntries(
                Object.keys(actions).map((action) => [action, false]),
            ),
        ]),
    );
}

export function UsersManager({
    sections,
    actions,
    roles,
    users,
}: UsersManagerProps) {
    const usersHandle = useRef<CreateHandle>(null);
    const rolesHandle = useRef<CreateHandle>(null);

    return (
        <AdminWorkspaceLayout
            title="Members"
            headerAction={
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => usersHandle.current?.openCreate()}
                    >
                        New user
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => rolesHandle.current?.openCreate()}
                    >
                        New role
                    </Button>
                </div>
            }
        >
            <div className="grid gap-8">
                <section className="grid gap-4 rounded-lg border p-4">
                    <h2 className="text-sm font-medium">Users</h2>
                    <UsersTable ref={usersHandle} roles={roles} users={users} />
                </section>
                <section className="grid gap-4 rounded-lg border p-4">
                    <h2 className="text-sm font-medium">Roles</h2>
                    <RolesTable
                        ref={rolesHandle}
                        sections={sections}
                        actions={actions}
                        roles={roles}
                    />
                </section>
            </div>
        </AdminWorkspaceLayout>
    );
}

export function UsersTable({
    roles,
    users,
    ref,
    hideIntro = false,
}: {
    roles: RoleRecord[];
    users: UserRecord[];
    ref?: React.Ref<CreateHandle>;
    hideIntro?: boolean;
}) {
    const [processing, setProcessing] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createDraft, setCreateDraft] = useState({
        name: '',
        email: '',
        roleId: '',
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>(
        {},
    );

    function openCreate() {
        setCreateErrors({});
        setCreateDraft({ name: '', email: '', roleId: '' });
        setIsCreateOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function createUser() {
        setProcessing(true);
        setCreateErrors({});
        router.post(
            '/admin/users',
            {
                name: createDraft.name,
                email: createDraft.email,
                role_id: createDraft.roleId,
            },
            {
                preserveScroll: true,
                onSuccess: () => setIsCreateOpen(false),
                onError: (validationErrors: Record<string, string>) =>
                    setCreateErrors(validationErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            {!hideIntro && (
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground text-sm">
                        New users receive an email to set their own password.
                    </p>
                </header>
            )}

            <Table>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No Results
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.isRootAdmin ? (
                                        <Badge>Root Admin</Badge>
                                    ) : user.roleName ? (
                                        <Badge variant="secondary">
                                            {user.roleName}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            No role
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    if (!processing) setIsCreateOpen(open);
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title="New User"
                        closeDisabled={processing}
                    />
                    <div className="grid gap-4">
                        {Object.keys(createErrors).length > 0 && (
                            <div
                                role="alert"
                                className="text-destructive text-sm"
                            >
                                {Object.entries(createErrors).map(
                                    ([field, message]) => (
                                        <p key={field}>{message}</p>
                                    ),
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Name</Label>
                            <Input
                                id="user-name"
                                value={createDraft.name}
                                onChange={(event) =>
                                    setCreateDraft((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-email">Email Address</Label>
                            <Input
                                id="user-email"
                                type="email"
                                value={createDraft.email}
                                onChange={(event) =>
                                    setCreateDraft((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Role</Label>
                            <Select
                                value={createDraft.roleId}
                                onValueChange={(value) =>
                                    setCreateDraft((current) => ({
                                        ...current,
                                        roleId: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem
                                            key={role.id}
                                            value={String(role.id)}
                                        >
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <AdminDialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="secondary"
                            disabled={processing || !createDraft.roleId}
                            onClick={createUser}
                        >
                            {processing ? 'Creating…' : 'Create User'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </>
    );
}

export function RolesTable({
    sections,
    actions,
    roles,
    ref,
    hideIntro = false,
}: {
    sections: Record<string, string>;
    actions: Record<string, string>;
    roles: RoleRecord[];
    ref?: React.Ref<CreateHandle>;
    hideIntro?: boolean;
}) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<{
        name: string;
        description: string;
        permissions: Record<string, SectionPermissions>;
    }>({
        name: '',
        description: '',
        permissions: emptyPermissions(sections, actions),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function openCreate() {
        setErrors({});
        setEditingId(null);
        setDraft({
            name: '',
            description: '',
            permissions: emptyPermissions(sections, actions),
        });
        setIsFormOpen(true);
    }

    useImperativeHandle(ref, () => ({ openCreate }));

    function openEdit(role: RoleRecord) {
        setErrors({});
        setEditingId(role.id);
        setDraft({
            name: role.name,
            description: role.description,
            permissions: {
                ...emptyPermissions(sections, actions),
                ...role.permissions,
            },
        });
        setIsFormOpen(true);
    }

    function setPermission(
        section: string,
        action: keyof SectionPermissions,
        value: boolean,
    ) {
        setDraft((current) => ({
            ...current,
            permissions: {
                ...current.permissions,
                [section]: { ...current.permissions[section], [action]: value },
            },
        }));
    }

    function save() {
        setProcessing(true);
        setErrors({});
        const payload = {
            name: draft.name,
            description: draft.description,
            permissions: draft.permissions,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => setIsFormOpen(false),
            onError: (validationErrors: Record<string, string>) =>
                setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        };
        if (editingId)
            router.patch(`/admin/roles/${editingId}`, payload, options);
        else router.post('/admin/roles', payload, options);
    }

    function destroy(role: RoleRecord) {
        setDeleteError(null);
        router.delete(`/admin/roles/${role.id}`, {
            preserveScroll: true,
            onError: (validationErrors: Record<string, string>) =>
                setDeleteError(
                    validationErrors.role ?? 'Could not delete this role.',
                ),
        });
    }

    return (
        <>
            {!hideIntro && (
                <header className="flex items-center justify-between gap-4">
                    <p className="text-muted-foreground text-sm">
                        Roles control which admin sections a user can see, edit,
                        or delete from.
                    </p>
                </header>
            )}

            {deleteError && (
                <p role="alert" className="text-destructive text-sm">
                    {deleteError}
                </p>
            )}

            <Table>
                <TableBody>
                    {roles.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={Object.keys(actions).length + 1}
                                className="h-24 text-center"
                            >
                                No Results
                            </TableCell>
                        </TableRow>
                    ) : (
                        roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium">
                                    {role.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {role.description || '—'}
                                </TableCell>
                                <TableCell>{role.userCount}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => openEdit(role)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={role.userCount > 0}
                                            onClick={() => destroy(role)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!processing) setIsFormOpen(open);
                }}
            >
                <AdminDialogContent className="sm:max-w-lg">
                    <AdminDialogHeader
                        title={editingId ? 'Edit Role' : 'New Role'}
                        closeDisabled={processing}
                    />
                    <div className="grid gap-4">
                        {Object.keys(errors).length > 0 && (
                            <div
                                role="alert"
                                className="text-destructive text-sm"
                            >
                                {Object.entries(errors).map(
                                    ([field, message]) => (
                                        <p key={field}>{message}</p>
                                    ),
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="role-name">Name</Label>
                            <Input
                                id="role-name"
                                value={draft.name}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role-description">
                                Description
                            </Label>
                            <Textarea
                                id="role-description"
                                value={draft.description}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Permissions</Label>
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Section</TableHead>
                                            {Object.values(actions).map(
                                                (label) => (
                                                    <TableHead
                                                        key={label}
                                                        className="text-center"
                                                    >
                                                        {label}
                                                    </TableHead>
                                                ),
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(sections).map(
                                            ([key, label]) => (
                                                <TableRow key={key}>
                                                    <TableCell>
                                                        {label}
                                                    </TableCell>
                                                    {Object.entries(
                                                        actions,
                                                    ).map(([action, label]) => (
                                                        <TableCell
                                                            key={action}
                                                            className="text-center"
                                                        >
                                                            <Checkbox
                                                                checked={
                                                                    draft
                                                                        .permissions[
                                                                        key
                                                                    ]?.[
                                                                        action
                                                                    ] ?? false
                                                                }
                                                                onCheckedChange={(
                                                                    value,
                                                                ) =>
                                                                    setPermission(
                                                                        key,
                                                                        action,
                                                                        value ===
                                                                            true,
                                                                    )
                                                                }
                                                                aria-label={`${label} ${action}`}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                    <AdminDialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={save}
                        >
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </AdminDialogFooter>
                </AdminDialogContent>
            </Dialog>
        </>
    );
}
