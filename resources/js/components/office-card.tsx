import { Mail, MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { Office } from '@/data/offices';

export function OfficeCard({ office }: { office: Office }) {
    return (
        <Card className="w-full gap-4 md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]">
            <CardContent className="grid gap-3 text-sm">
                <CardTitle className="text-lg font-medium">
                    {office.name}
                </CardTitle>
                <div className="text-muted-foreground flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span className="whitespace-pre-line">
                        {office.address}
                    </span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                    <Phone className="size-4 shrink-0" />
                    <span>{office.phone}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                    <Mail className="size-4 shrink-0" />
                    <span>{office.email}</span>
                </div>
            </CardContent>
        </Card>
    );
}
