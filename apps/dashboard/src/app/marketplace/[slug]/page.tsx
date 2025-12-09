"use client";

import {
  ArrowLeft,
  BookOpen,
  Calculator,
  Check,
  CloudSun,
  Coins,
  ExternalLink,
  Link,
  Mail,
  Package,
  Search,
  Wrench,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgent } from "@/lib/agent-context";
import {
  type Agent,
  getMarketplaceTool,
  installMarketplaceTool,
  listAgents,
  type ToolTemplateDetail,
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";

// Map icon names to Lucide components
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-8 h-8" />,
  "cloud-sun": <CloudSun className="w-8 h-8" />,
  calculator: <Calculator className="w-8 h-8" />,
  "book-open": <BookOpen className="w-8 h-8" />,
  link: <Link className="w-8 h-8" />,
  coins: <Coins className="w-8 h-8" />,
  package: <Package className="w-8 h-8" />,
  mail: <Mail className="w-8 h-8" />,
  wrench: <Wrench className="w-8 h-8" />,
};

// Category display names and colors
const categoryInfo: Record<string, { label: string; color: string }> = {
  search: { label: "Search", color: "bg-blue-100 text-blue-800" },
  data: { label: "Data", color: "bg-green-100 text-green-800" },
  productivity: { label: "Productivity", color: "bg-purple-100 text-purple-800" },
  communication: { label: "Communication", color: "bg-orange-100 text-orange-800" },
  ecommerce: { label: "E-commerce", color: "bg-pink-100 text-pink-800" },
};

export default function ToolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { currentAgent } = useAgent();

  const [tool, setTool] = useState<ToolTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchTool() {
      try {
        const data = await getMarketplaceTool(slug);
        setTool(data);
      } catch (err) {
        console.error("Failed to fetch tool:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTool();
  }, [slug]);

  useEffect(() => {
    async function checkAuth() {
      const session = await authClient.getSession();
      setIsAuthenticated(!!session?.data?.user);
    }
    checkAuth();
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await listAgents();
      setAgents(data);
      if (currentAgent) {
        setSelectedAgentId(currentAgent.id);
      } else if (data.length > 0) {
        setSelectedAgentId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    }
  }, [currentAgent]);

  const handleInstallClick = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/marketplace/" + slug);
      return;
    }
    await fetchAgents();
    setShowInstallDialog(true);
  };

  const handleInstall = async () => {
    if (!selectedAgentId || !tool) return;

    setInstalling(true);
    try {
      await installMarketplaceTool(tool.slug, selectedAgentId, configValues);
      toast.success(`${tool.name} installed successfully!`);
      setShowInstallDialog(false);
      router.push("/tools");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to install tool");
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-12 mx-auto px-4">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-12 mx-auto px-4">
          <p className="text-center text-muted-foreground">Tool not found</p>
        </div>
      </div>
    );
  }

  const icon = iconMap[tool.icon] || <Wrench className="w-8 h-8" />;
  const category = categoryInfo[tool.category] || {
    label: tool.category,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-8 mx-auto px-4">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>

          <div className="flex items-start gap-6">
            <div className="p-4 rounded-xl bg-gray-100">{icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{tool.name}</h1>
                <span className={`px-3 py-1 text-sm rounded-full ${category.color}`}>
                  {category.label}
                </span>
                {tool.isFree ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  <Badge variant="outline">API Key Required</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">{tool.description}</p>
            </div>
            <Button size="lg" onClick={handleInstallClick}>
              <Check className="w-4 h-4 mr-2" />
              {isAuthenticated ? "Install Tool" : "Sign in to Install"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8 mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {tool.longDescription && (
              <Card>
                <CardHeader>
                  <CardTitle>About this Tool</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {tool.longDescription}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Tool Function</CardTitle>
                <CardDescription>This is how the AI will call this tool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 font-mono text-sm rounded-lg bg-gray-100">
                  <div className="text-blue-600">{tool.toolName}(</div>
                  <div className="pl-4">
                    {Object.entries(tool.inputSchema.properties).map(([key, prop]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-purple-600">{key}</span>
                        <span className="text-gray-500">:</span>
                        <span className="text-green-600">{prop.type}</span>
                        {tool.inputSchema.required?.includes(key) && (
                          <span className="text-red-500 text-xs">(required)</span>
                        )}
                        {prop.description && (
                          <span className="text-gray-400 ml-2">{`// ${prop.description}`}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-blue-600">)</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Settings required to use this tool</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.requiredConfig && tool.requiredConfig.length > 0 ? (
                  <ul className="space-y-3">
                    {tool.requiredConfig.map((config) => (
                      <li key={config.key} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium">{config.label}</p>
                          {config.helpText && (
                            <p className="text-sm text-muted-foreground">{config.helpText}</p>
                          )}
                          {config.helpUrl && (
                            <a
                              href={config.helpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              Get API Key <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No configuration required. This tool works out of the box!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-mono">{tool.executionType}</span>
                </div>
                {tool.httpMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HTTP Method</span>
                    <span className="font-mono">{tool.httpMethod}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install {tool.name}</DialogTitle>
            <DialogDescription>
              Configure the tool and select which agent to install it on.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Agent Selection */}
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Configuration Fields */}
            {tool.requiredConfig?.map((config) => (
              <div key={config.key} className="space-y-2">
                <Label htmlFor={config.key}>
                  {config.label}
                  {config.helpUrl && (
                    <a
                      href={config.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-primary hover:underline"
                    >
                      Get one <ExternalLink className="inline w-3 h-3" />
                    </a>
                  )}
                </Label>
                <Input
                  id={config.key}
                  type={config.type === "password" ? "password" : "text"}
                  placeholder={config.placeholder}
                  value={configValues[config.key] || ""}
                  onChange={(e) =>
                    setConfigValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                  }
                />
                {config.helpText && (
                  <p className="text-xs text-muted-foreground">{config.helpText}</p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={installing || !selectedAgentId}>
              {installing ? "Installing..." : "Install"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
