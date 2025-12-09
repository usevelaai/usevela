"use client";

import {
  BarChart3,
  Bot,
  ChevronDown,
  Code,
  FileText,
  Globe,
  HelpCircle,
  History,
  Home,
  MessageSquare,
  Palette,
  PanelLeft,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import LogoIcon from "@/icons/logo";
import { useConfig } from "@/lib/config-context";

interface AppSidebarProps {
  userEmail?: string | null;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { isSelfHosted } = useConfig();
  const isCollapsed = state === "collapsed";

  // Check if we're on the home page or team settings (no agent context)
  const isHomePage = pathname === "/" || pathname === "/team" || pathname === "/billing";

  // Home page sidebar items (filter out Usage for self-hosted)
  const homeSidebarItems = [
    { icon: Bot, label: "Agents", href: "/" },
    ...(!isSelfHosted ? [{ icon: BarChart3, label: "Usage", href: "/billing" }] : []),
    { icon: Users, label: "Team Settings", href: "/team" },
  ];

  // Agent-specific sidebar items
  const playgroundItems = [{ icon: MessageSquare, label: "Playground", href: "/chat" }];

  const activityItems = [
    { icon: History, label: "History", href: "/history" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
  ];

  const sourceItems = [
    { icon: Home, label: "Files", href: "/files" },
    { icon: FileText, label: "Texts", href: "/text-sources" },
    { icon: HelpCircle, label: "Q&A", href: "/qa-sources" },
    { icon: Globe, label: "Web Sources", href: "/web-sources" },
  ];

  const settingsItems = [
    { icon: Palette, label: "Interface", href: "/interface" },
    { icon: Code, label: "Widget", href: "/widget" },
    { icon: Shield, label: "Security", href: "/security" },
    { icon: Settings, label: "Agent Settings", href: "/agents" },
  ];

  const toolsItems = [
    { icon: Wrench, label: "Tools", href: "/tools" },
  ];

  const renderMenuItem = (item: { icon: React.ElementType; label: string; href: string }) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        asChild
        isActive={pathname === item.href}
        tooltip={item.label}
      >
        <Link href={item.href}>
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderCollapsibleGroup = (
    title: string,
    items: { icon: React.ElementType; label: string; href: string }[]
  ) => (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            {title}
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  const renderSidebarContent = () => {
    // Home page sidebar - simplified navigation
    if (isHomePage) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {homeSidebarItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    // Agent-specific sidebar - collapsed shows flat icons
    if (isCollapsed) {
      return (
        <>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {playgroundItems.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...activityItems, ...sourceItems, ...toolsItems, ...settingsItems].map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      );
    }

    // Agent-specific sidebar - expanded shows collapsible groups
    return (
      <>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {playgroundItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {renderCollapsibleGroup("Activity", activityItems)}
        {renderCollapsibleGroup("Knowledge Sources", sourceItems)}
        {renderCollapsibleGroup("Tools / API", toolsItems)}
        {renderCollapsibleGroup("Settings", settingsItems)}
      </>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <LogoIcon className="w-6 h-6 shrink-0" />
          {!isCollapsed && <span className="text-lg font-bold">Vela</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderSidebarContent()}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-2">
          {!isCollapsed && userEmail && (
            <p className="text-sm truncate text-muted-foreground">{userEmail}</p>
          )}
          <SidebarTrigger className="ml-auto">
            <PanelLeft className="w-4 h-4" />
          </SidebarTrigger>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
