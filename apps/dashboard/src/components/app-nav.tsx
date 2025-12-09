"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function AppNav() {
	const pathname = usePathname();
	const router = useRouter();

	const navItems = [
		{ href: "/", label: "Documents" },
		{ href: "/chat", label: "Chat" },
		{ href: "/text-sources", label: "Sources" },
		{ href: "/history", label: "History" },
		{ href: "/agents", label: "Agents" },
		{ href: "/tools", label: "Tools" },
	];

	return (
		<nav className="flex items-center justify-between mb-6">
			<NavigationMenu>
				<NavigationMenuList>
					{navItems.map((item) => (
						<NavigationMenuItem key={item.href}>
							<Link href={item.href} legacyBehavior passHref>
								<NavigationMenuLink
									className={cn(
										navigationMenuTriggerStyle(),
										pathname === item.href && "bg-accent",
									)}
								>
									{item.label}
								</NavigationMenuLink>
							</Link>
						</NavigationMenuItem>
					))}
				</NavigationMenuList>
			</NavigationMenu>
			<Button
				variant="outline"
				size="sm"
				onClick={() => signOut().then(() => router.push("/login"))}
			>
				Logout
			</Button>
		</nav>
	);
}
