import * as React from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from 'cn';

export function ChartContainer({
    children,
    className,
}: React.ComponentProps<'div'>) {
    return (
        <div className={cn('h-28 w-full', className)}>{children}</div>
    );
}

export function MetricLineChart({
    data,
    dataKey,
    color = 'var(--primary)',
}: {
    data: { date: string; [key: string]: string | number }[];
    dataKey: string;
    color?: string;
}) {
    return (
        <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                        cursor={{ stroke: 'var(--border)' }}
                        contentStyle={{
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--card-foreground)',
                        }}
                        labelFormatter={(value) => String(value)}
                    />
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}
