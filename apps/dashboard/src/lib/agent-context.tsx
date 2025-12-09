"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type Agent, createAgent, listAgents } from "@/lib/api";

export type { Agent } from "@/lib/api";

interface UseAgentsResult {
  agents: Agent[];
  currentAgent: Agent | null;
  currentAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  refetchAgents: () => Promise<void>;
  setCurrentAgent: (agent: Agent) => void;
}

/**
 * Hook to get the list of agents and current agent from URL.
 * Components using this hook should be wrapped in Suspense.
 */
export function useAgents(): UseAgentsResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agentIdFromUrl = searchParams.get("agent");

  const fetchAgents = useCallback(async () => {
    try {
      setError(null);
      const agentList = await listAgents();
      setAgents(agentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const currentAgent =
    agents.find((a) => a.id === agentIdFromUrl) ||
    agents.find((a) => a.isDefault) ||
    agents[0] ||
    null;

  const setCurrentAgent = useCallback(
    (agent: Agent) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("agent", agent.id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return {
    agents,
    currentAgent,
    currentAgentId: currentAgent?.id || null,
    isLoading,
    error,
    refetchAgents: fetchAgents,
    setCurrentAgent,
  };
}

export const useAgent = useAgents;
