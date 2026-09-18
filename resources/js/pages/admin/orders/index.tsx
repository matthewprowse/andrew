import {
    OrdersManager,
    type OrdersProps,
} from '@/features/admin/orders/orders-manager';

export default function OrdersIndex(props: OrdersProps) {
    return <OrdersManager {...props} />;
}
