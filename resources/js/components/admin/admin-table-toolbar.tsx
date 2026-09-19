import type { MouseEventHandler, ReactNode } from 'react';
import {
    ArrowDown,
    ArrowUp,
    LayoutGrid,
    Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type AdminViewMode = 'table' | 'cards';

type SortColumn = {
    id: string;
    getIsSorted: () => false | 'asc' | 'desc';
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
};

export function AdminViewToggle({
    value,
    onChange,
}: {
    value: AdminViewMode;
    onChange: (value: AdminViewMode) => void;
}) {
    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value}
            onValueChange={(next) => {
                if (next === 'table' || next === 'cards') onChange(next);
            }}
        >
            <ToggleGroupItem value="table" aria-label="Table view">
                <TableIcon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view">
                <LayoutGrid className="size-4" />
            </ToggleGroupItem>
        </ToggleGroup>
    );
}

export function AdminSortMenu({
    columns,
    labels = {},
    align = 'end',
    variant = 'secondary',
}: {
    columns: SortColumn[];
    labels?: Record<string, string>;
    align?: 'start' | 'center' | 'end';
    variant?: 'ghost' | 'secondary';
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={variant}>Sort</Button>
            </PopoverTrigger>
            <PopoverContent align={align} sideOffset={8} className="w-56">
                {columns.map((column) => {
                    const sorted = column.getIsSorted();
                    return (
                        <button
                            key={column.id}
                            onClick={
                                column.getToggleSortingHandler() as MouseEventHandler<HTMLButtonElement>
                            }
                            className="hover:bg-accent hover:text-accent-foreground relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm select-none"
                        >
                            {labels[column.id] ?? column.id}
                            <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                                {sorted === 'asc' && (
                                    <ArrowUp className="size-3.5" />
                                )}
                                {sorted === 'desc' && (
                                    <ArrowDown className="size-3.5" />
                                )}
                            </span>
                        </button>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}

export function AdminTableToolbar({
    search,
    onSearchChange,
    searchPlaceholder = 'Search',
    searchClassName = 'h-8 w-96',
    sortColumns,
    sortLabels,
    sortAlign = 'end',
    sortVariant = 'secondary',
    viewMode,
    onViewModeChange,
    children,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    searchClassName?: string;
    sortColumns: SortColumn[];
    sortLabels?: Record<string, string>;
    sortAlign?: 'start' | 'center' | 'end';
    sortVariant?: 'ghost' | 'secondary';
    viewMode?: AdminViewMode;
    onViewModeChange?: (value: AdminViewMode) => void;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {viewMode && onViewModeChange && (
                <AdminViewToggle value={viewMode} onChange={onViewModeChange} />
            )}
            <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className={searchClassName}
            />
            <AdminSortMenu
                columns={sortColumns}
                labels={sortLabels}
                align={sortAlign}
                variant={sortVariant}
            />
            {children}
        </div>
    );
}
