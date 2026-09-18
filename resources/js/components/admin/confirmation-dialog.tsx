import {
    AdminDialogContent,
    AdminDialogFooter,
    AdminDialogHeader,
} from '@/components/admin/admin-dialog';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export function ConfirmationDialog({
    open,
    title,
    description,
    confirmLabel,
    onOpenChange,
    onConfirm,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AdminDialogContent className="sm:max-w-md">
                <AdminDialogHeader title={title} />
                <p className="text-muted-foreground text-sm">{description}</p>
                <AdminDialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </AdminDialogFooter>
            </AdminDialogContent>
        </Dialog>
    );
}
