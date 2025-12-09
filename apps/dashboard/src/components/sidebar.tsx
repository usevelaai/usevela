"use client";

import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  HelpCircle,
  History,
  Home,
  MessageSquare,
  Palette,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import LogoIcon from "@/icons/logo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userEmail?: string | null;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, userEmail }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the home page or team settings (no agent context)
  const isHomePage = pathname === "/" || pathname === "/team" || pathname === "/billing";

  // Home page sidebar items
  const homeSidebarItems = [
    { icon: Bot, label: "Agents", href: "/" },
    { icon: BarChart3, label: "Usage", href: "/billing" },
    { icon: Users, label: "Team Settings", href: "/team" },
  ];

  // Agent-specific sidebar items
  const sidebarItems = [{ icon: MessageSquare, label: "Playground", href: "/chat" }];

  const activityItems = [{ icon: History, label: "History", href: "/history" }];

  const sourceItems = [
    { icon: Home, label: "Files", href: "/files" },
    { icon: FileText, label: "Texts", href: "/text-sources" },
    { icon: HelpCircle, label: "Q&A", href: "/qa-sources" },
  ];

  const settingsItems = [
    { icon: Palette, label: "Interface", href: "/interface" },
    { icon: Code, label: "Widget", href: "/widget" },
    { icon: Shield, label: "Security", href: "/security" },
    { icon: Settings, label: "Agent Settings", href: "/agents" },
  ];

  return (
    <aside
      className={cn(
        "border-r bg-gray-50 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      <div className="flex flex-col gap-3 p-4 border-b">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2 row">
              <LogoIcon />
              <h2 className="text-lg font-bold">Vela</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(!sidebarOpen && "mx-auto")}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {isHomePage ? (
          // Home page sidebar - simplified navigation
          homeSidebarItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-left",
                pathname === item.href && "bg-gray-200 font-medium",
                !sidebarOpen && "justify-center",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))
        ) : (
          // Agent-specific sidebar
          <>
            {sidebarItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-left",
                  pathname === item.href && "bg-gray-200 font-medium",
                  !sidebarOpen && "justify-center",
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}

            {sidebarOpen && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase">Activity</p>
                </div>
                {activityItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-left",
                      pathname === item.href && "bg-gray-200 font-medium",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}

                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase">
                    Knowledge Sources
                  </p>
                </div>
                {sourceItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-left",
                      pathname === item.href && "bg-gray-200 font-medium",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}

                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase">Settings</p>
                </div>
                {settingsItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-left",
                      pathname === item.href && "bg-gray-200 font-medium",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </>
            )}

            {!sidebarOpen && (
              <>
                {activityItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors justify-center",
                      pathname === item.href && "bg-gray-200",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </button>
                ))}
                {sourceItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors justify-center",
                      pathname === item.href && "bg-gray-200",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </button>
                ))}
                {settingsItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors justify-center",
                      pathname === item.href && "bg-gray-200",
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {sidebarOpen && (
        <div className="p-4 text-sm text-gray-600 border-t">
          <p className="font-medium">{userEmail}</p>
        </div>
      )}
    </aside>
  );
}
