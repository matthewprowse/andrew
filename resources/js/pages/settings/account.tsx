import { Head, usePage } from "@inertiajs/react";
import { Palette, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import Heading from "@/components/heading";
import Appearance from "@/pages/settings/appearance";
import Profile from "@/pages/settings/profile";
import Security from "@/pages/settings/security";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import type { Props as ManagePasskeysProps } from "@/components/manage-passkeys";
import type { Props as ManageTwoFactorProps } from "@/components/manage-two-factor";

type Section = "account" | "security" | "appearance";

const sections = [
    {
        key: "account" as const,
        label: "Account",
        description: "Update your name, email address, photo, and bio.",
        icon: UserRound,
    },
    {
        key: "security" as const,
        label: "Security",
        description: "Update your password and account security preferences.",
        icon: ShieldCheck,
    },
    {
        key: "appearance" as const,
        label: "Appearance",
        description: "Choose how your account looks and feels.",
        icon: Palette,
    },
];

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

function initialSection(url: string): Section {
    const section = new URLSearchParams(url.split("?")[1] ?? "").get("section");
    return section === "security" || section === "appearance" ? section : "account";
}

export default function AccountSettings(props: Props) {
    const { url } = usePage();
    const [activeSection, setActiveSection] = useState<Section>(() => initialSection(url));
    const currentSection = sections.find((section) => section.key === activeSection) ?? sections[0];

    return (
        <>
            <Head title="Account Settings" />
            <div className="px-4 py-6">
                <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
                    <SidebarProvider defaultOpen className="min-h-0 w-full">
                        <Sidebar
                            collapsible="none"
                            variant="sidebar"
                            className="sticky top-6 h-fit"
                        >
                            <SidebarContent>
                                <SidebarGroup className="p-0">
                                    <SidebarMenu className="gap-0.5">
                                        {sections.map((section) => (
                                            <SidebarMenuItem key={section.key}>
                                                <SidebarMenuButton
                                                    type="button"
                                                    isActive={section.key === activeSection}
                                                    onClick={() => setActiveSection(section.key)}
                                                >
                                                    <section.icon className="size-4" />
                                                    <span>{section.label}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroup>
                            </SidebarContent>
                        </Sidebar>
                    </SidebarProvider>

                    <div className="min-w-0">
                        <Heading
                            as="h1"
                            variant="large"
                            title={currentSection.label}
                            description={currentSection.description}
                        />
                        {activeSection === "account" && (
                            <Profile
                                embedded
                                mustVerifyEmail={props.mustVerifyEmail}
                                status={props.status}
                            />
                        )}
                        {activeSection === "security" && <Security embedded {...props} />}
                        {activeSection === "appearance" && <Appearance embedded />}
                    </div>
                </div>
            </div>
        </>
    );
}
