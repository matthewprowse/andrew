import { usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

export function SiteHeader() {
    const { publicSettings } = usePage<{
        publicSettings: import('@/types/site-settings').PublicSettings;
    }>().props;
    const navItems = publicSettings.menu
        .filter((item) => item.section === 'header')
        .map((item) => {
            const children = item.children.map((child) => ({
                title: child.label,
                href: child.link,
            }));

            return {
                title: item.label,
                href: item.link,
                children: children.length ? children : undefined,
            };
        });

    const { isCurrentUrl } = useCurrentUrl();
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const closePopoverTimeout = useRef<number | null>(null);

    function openMenu(href: string) {
        if (closePopoverTimeout.current !== null) {
            window.clearTimeout(closePopoverTimeout.current);
        }

        setOpenPopover(href);
    }

    function closeMenu() {
        closePopoverTimeout.current = window.setTimeout(
            () => setOpenPopover(null),
            100,
        );
    }

    return (
        <header className="bg-background sticky top-0 z-40">
            <div className="mx-auto flex h-16 max-w-7xl items-center px-6 md:px-8">
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="mr-2"
                            >
                                <Menu />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72">
                            <SheetHeader>
                                <SheetTitle asChild>
                                    <a
                                        href="/"
                                        className="text-lg font-semibold"
                                    >
                                        Relocation Africa
                                    </a>
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 p-4 pt-0">
                                {navItems.map((item) => (
                                    <div key={item.href} className="grid gap-1">
                                        <Button
                                            asChild
                                            variant={
                                                isCurrentUrl(item.href) ||
                                                item.children?.some((child) =>
                                                    isCurrentUrl(child.href),
                                                )
                                                    ? 'secondary'
                                                    : 'ghost'
                                            }
                                            className="justify-start font-normal"
                                        >
                                            <a href={item.href}>{item.title}</a>
                                        </Button>
                                        {item.children?.filter(
                                            (child) => child.href !== item.href,
                                        ).length ? (
                                            <div className="ml-4 grid gap-1 border-l pl-3">
                                                {item.children
                                                    .filter(
                                                        (child) =>
                                                            child.href !==
                                                            item.href,
                                                    )
                                                    .map((child) => (
                                                        <Button
                                                            key={child.href}
                                                            asChild
                                                            variant={
                                                                isCurrentUrl(
                                                                    child.href,
                                                                )
                                                                    ? 'secondary'
                                                                    : 'ghost'
                                                            }
                                                            className="justify-start font-normal"
                                                        >
                                                            <a
                                                                href={
                                                                    child.href
                                                                }
                                                            >
                                                                {child.title}
                                                            </a>
                                                        </Button>
                                                    ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                <a href="/" className="text-lg font-semibold">
                    Relocation Africa
                </a>

                <nav className="ml-auto hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => {
                        const isActive =
                            isCurrentUrl(item.href) ||
                            (item.children?.some((child) =>
                                isCurrentUrl(child.href),
                            ) ??
                                false);

                        if (!item.children) {
                            return (
                                <Button
                                    key={item.href}
                                    asChild
                                    variant={isActive ? 'secondary' : 'ghost'}
                                    className="font-normal"
                                >
                                    <a href={item.href}>{item.title}</a>
                                </Button>
                            );
                        }

                        return (
                            <Popover
                                key={item.href}
                                open={openPopover === item.href}
                                onOpenChange={(open) =>
                                    setOpenPopover(open ? item.href : null)
                                }
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={
                                            isActive ? 'secondary' : 'ghost'
                                        }
                                        className="font-normal"
                                        onMouseEnter={() => openMenu(item.href)}
                                        onMouseLeave={closeMenu}
                                    >
                                        {item.title}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    sideOffset={8}
                                    className="w-56"
                                    onMouseEnter={() => openMenu(item.href)}
                                    onMouseLeave={closeMenu}
                                >
                                    {item.children.map((child) => (
                                        <a
                                            key={child.href}
                                            href={child.href}
                                            className={cn(
                                                'hover:bg-accent hover:text-accent-foreground relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm select-none',
                                                isCurrentUrl(child.href) &&
                                                    'bg-secondary text-secondary-foreground',
                                            )}
                                        >
                                            {child.title}
                                        </a>
                                    ))}
                                </PopoverContent>
                            </Popover>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
