import {
    UsersManager,
    type UsersManagerProps,
} from '@/features/admin/users/users-manager';

export default function UsersIndex(props: UsersManagerProps) {
    return <UsersManager {...props} />;
}
