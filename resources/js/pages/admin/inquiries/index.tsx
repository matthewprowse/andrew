import {
    InquiriesManager,
    type InquiriesProps,
} from '@/features/admin/inquiries/inquiries-manager';

export default function InquiriesIndex(props: InquiriesProps) {
    return <InquiriesManager {...props} />;
}
