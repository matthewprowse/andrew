import type { ReactTable, RowData, TableFeatures } from '@tanstack/react-table';
import { cn } from 'cn';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface DataTableProps<TFeatures extends TableFeatures, TData extends RowData> {
    table: ReactTable<TFeatures, TData>;
    onRowClick?: (row: TData) => void;
    showHeader?: boolean;
    rowClassName?: string | ((row: TData) => string);
    cellClassName?: string;
}

export function DataTable<TFeatures extends TableFeatures, TData extends RowData>({
    table,
    onRowClick,
    showHeader = true,
    rowClassName,
    cellClassName,
}: DataTableProps<TFeatures, TData>) {
    return (
        <div>
            <Table>
                <TableHeader className={showHeader ? undefined : 'sr-only'}>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                className={cn(
                                    onRowClick ? 'cursor-pointer' : undefined,
                                    typeof rowClassName === 'function'
                                        ? rowClassName(row.original)
                                        : rowClassName,
                                )}
                            >
                                {row.getAllCells().map((cell) => (
                                <TableCell key={cell.id} className={cellClassName}>
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                                No Results
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
