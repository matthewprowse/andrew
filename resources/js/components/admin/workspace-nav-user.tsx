import { Link, router, usePage } from '@inertiajs/react';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';

// AdminWorkspaceLayout-only variant of nav-user.tsx: Account Settings is a
// direct sidebar link there (see admin-workspace-layout.tsx's SidebarFooter)
// rather than living inside this dropdown, so this menu only ever shows
// account info + log out. Deliberately NOT a shared/parameterized version of
// NavUser/UserMenuContent — those two files are still used as-is by
// admin-layout.tsx (Estimator, Account Settings, admin/section.tsx), which
// keeps its Settings-in-a-popover behavior untouched.
export function WorkspaceNavUser() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const cleanup = useMobileNavigation();

    if (!auth.user) {
        return null;
    }

    function handleLogout() {
        cleanup();
        router.flushAll();
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo user={auth.user} />
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <UserInfo user={auth.user} showEmail={true} />
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                className="block w-full cursor-pointer"
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                                data-test="logout-button"
                            >
                                <LogOut className="mr-2" />
                                Log out
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
