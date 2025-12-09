"use client";

import { Bot, Check, ChevronsUpDown, Lock, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AgentLimits, getAgentLimits } from "@/lib/api";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

interface AgentSelectorProps {
  agents: Agent[];
  currentAgentId: string | null;
}

export function AgentSelector({ agents, currentAgentId }: AgentSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [limits, setLimits] = useState<AgentLimits | null>(null);

  useEffect(() => {
    getAgentLimits().then(setLimits).catch(console.error);
  }, []);

  const currentAgent = agents.find((a) => a.id === currentAgentId) || agents[0];

  const setCurrentAgent = useCallback(
    (agent: Agent) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("agent", agent.id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  if (agents.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/agents")}>
        <Plus className="h-4 w-4 mr-2" />
        Create agent
      </Button>
    );
  }

  const canCreate = limits?.canCreate ?? true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-48 justify-between">
          <span className="flex items-center gap-2 truncate">
            <Bot className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentAgent?.name || "Select agent"}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => setCurrentAgent(agent)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{agent.name}</span>
            {currentAgent?.id === agent.id && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {canCreate ? (
          <DropdownMenuItem onClick={() => router.push("/agents/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create new agent
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => router.push("/billing")}
            className="text-muted-foreground"
          >
            <Lock className="h-4 w-4 mr-2" />
            Upgrade to add more
          </DropdownMenuItem>
        )}
        {limits && limits.limit !== null && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
            {limits.current}/{limits.limit} agents used
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
