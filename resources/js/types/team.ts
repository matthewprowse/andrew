export type TeamMemberRecord = {
    id: string;
    name: string;
    role: string;
    bio: string;
    photoUrl: string;
    photoAlt: string;
};

export type TeamMemberAdminRecord = {
    id: string;
    name: string;
    role: string;
    bio: string;
    photo: { id: string; url: string; fileName: string } | null;
    sortOrder: number;
    status: 'Draft' | 'Published';
};
