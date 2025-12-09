"use client";

import { LogOut, Settings, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAgents } from "@/lib/agent-context";
import { getUsage, type UsageData } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";
import { cn } from "@/lib/utils";

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const { currentAgent } = useAgents();
  const { isSelfHosted } = useConfig();
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    // Only fetch usage for non-self-hosted installations
    if (session && !isSelfHosted) {
      getUsage().then(setUsage).catch(console.error);
    }
  }, [session, isSelfHosted]);

  // Calculate days remaining in billing period
  const getDaysRemaining = () => {
    if (!usage?.billingPeriodEnd) return null;
    const end = new Date(usage.billingPeriodEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();
  const isFreePlan = usage?.planId === "free";

  if (isPending) {
    return <div className="max-w-4xl p-8">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Check if we're on the home page or team settings (no agent context)
  const isHomePage = pathname === "/" || pathname === "/team" || pathname === "/billing";

  return (
    <SidebarProvider>
      <AppSidebar userEmail={session.user?.email} />
      <SidebarInset>
        <header className="bg-white border-b">
          <div className="flex items-center justify-between gap-4 px-8 py-3">
            {/* Breadcrumb - left side */}
            <div className="flex-1">
              {!isHomePage && currentAgent && (
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/">Agents</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentAgent.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                    {pathname !== "/chat" && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>
                            {pathname === "/files" && "Files"}
                            {pathname === "/text-sources" && "Texts"}
                            {pathname === "/qa-sources" && "Q&A"}
                            {pathname === "/web-sources" && "Web Sources"}
                            {pathname === "/history" && "History"}
                            {pathname === "/interface" && "Interface"}
                            {pathname === "/widget" && "Widget"}
                            {pathname === "/security" && "Security"}
                            {pathname === "/agents" && "Agent Settings"}
                            {pathname === "/analytics" && "Analytics"}
                            {pathname === "/tools" && "Tools"}
                            {pathname === "/account" && "Account Settings"}
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>

            {/* Right side items */}
            <div className="flex items-center gap-4">
              {!isSelfHosted && isFreePlan && daysRemaining !== null && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left in free trial
                  </span>
                  <Link href="/billing">
                    <Button size="sm" className="gap-1">
                      <Sparkles className="w-4 h-4" />
                      Upgrade
                    </Button>
                  </Link>
                </div>
              )}

              {/* Usage Progress - only show for non-self-hosted */}
              {!isSelfHosted && usage && (
                <Link
                  href="/billing"
                  className="flex items-center gap-2 text-sm transition-colors text-muted-foreground hover:text-foreground"
                  title={`${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()} messages used`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all rounded-full",
                          usage.percentUsed >= 95
                            ? "bg-destructive"
                            : usage.percentUsed >= 80
                              ? "bg-yellow-500"
                              : "bg-primary",
                        )}
                        style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs whitespace-nowrap">
                      {usage.used.toLocaleString()}/{usage.limit.toLocaleString()}
                    </span>
                  </div>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative rounded-full h-9 w-9">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={session.user?.image || undefined}
                        alt={session.user?.name || ""}
                      />
                      <AvatarFallback>
                        {session.user?.name?.charAt(0)?.toUpperCase() ||
                          session.user?.email?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      {session.user?.name && <p className="text-sm font-medium">{session.user.name}</p>}
                      <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/account")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      router.push("/login");
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
