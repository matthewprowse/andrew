import { Form, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
    embedded = false,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    embedded?: boolean;
}) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const isAdminContext =
        new URLSearchParams(page.url.split('?')[1] ?? '').get('context') ===
        'admin';
    const [photoPreview, setPhotoPreview] = useState(auth.user.avatar);
    const getInitials = useInitials();

    return (
        <>
            {!embedded && <Head title="Account Settings" />}

            <div className="space-y-6">
                {!embedded && (
                    <Heading
                        as="h1"
                        variant="large"
                        title="Account"
                        description="Update your name, email address, photo, and bio"
                    />
                )}

                <Form
                    {...ProfileController.update.form(
                        isAdminContext
                            ? { query: { context: 'admin' } }
                            : undefined,
                    )}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full Name"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email Address"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="avatar">Profile Photo</Label>
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-16">
                                        <AvatarImage
                                            src={photoPreview}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback>
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-1.5">
                                        <Input
                                            id="avatar"
                                            name="avatar"
                                            type="file"
                                            accept="image/*"
                                            className="max-w-sm cursor-pointer"
                                            onChange={(event) => {
                                                const file =
                                                    event.target.files?.[0];
                                                if (file)
                                                    setPhotoPreview(
                                                        URL.createObjectURL(
                                                            file,
                                                        ),
                                                    );
                                            }}
                                        />
                                        <p className="text-muted-foreground text-xs">
                                            Upload a JPG, PNG, or WebP image up
                                            to 2 MB.
                                        </p>
                                    </div>
                                </div>
                                <InputError
                                    className="mt-2"
                                    message={errors.avatar}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    defaultValue={auth.user.bio ?? ''}
                                    placeholder="Tell Your Team a Little About Yourself"
                                    className="min-h-32"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.bio}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="text-muted-foreground -mt-4 text-sm">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to re-send the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
