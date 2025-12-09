"use client";

import { Bot, MessageSquare, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgents } from "@/lib/agent-context";
import { type AgentLimits, getAgentLimits } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import LandingPage from "./(marketing)/page";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { agents, isLoading, currentAgent, setCurrentAgent } = useAgents();
  const [limits, setLimits] = useState<AgentLimits | null>(null);

  useEffect(() => {
    if (session?.user) {
      getAgentLimits().then(setLimits).catch(console.error);
    }
  }, [session?.user]);

  const handleAgentClick = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setCurrentAgent(agent);
      router.push(`/chat?agent=${agentId}`);
    }
  };

  const handleConfigureAgent = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/agents?agent=${agentId}`);
  };

  const renderAgents = () => {
    if (agents.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 mb-4 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Create your first AI agent to get started
            </p>
            <Link href="/agents/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${currentAgent?.id === agent.id ? "border-primary" : ""
              }`}
            onClick={() => handleAgentClick(agent.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription className="text-xs">{agent.model}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                {agent.systemPrompt}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-1"
                  onClick={() => handleAgentClick(agent.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleConfigureAgent(agent.id, e)}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!session?.user) {
    return <LandingPage />;
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-4xl p-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Agents</h1>
            <p className="mt-1 text-muted-foreground">
              Select an agent to start chatting or configure its settings
            </p>
          </div>
          {limits?.canCreate && (
            <Link href="/agents/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Agent
              </Button>
            </Link>
          )}
        </div>

        {renderAgents()}

        {limits && limits.limit !== null && (
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {limits.current} / {limits.limit} agents used
            {!limits.canCreate && (
              <span className="ml-2">
                •{" "}
                <Link href="/billing" className="text-primary hover:underline">
                  Upgrade to create more
                </Link>
              </span>
            )}
          </p>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
