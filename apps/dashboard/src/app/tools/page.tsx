"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
  type AgentTool,
  type AnalyticsToolData,
  createTool,
  deleteTool,
  getAnalyticsTools,
  getTool,
  listTools,
  type ToolInputSchema,
  updateTool,
} from "@/lib/api";

const toolSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores (e.g., get_weather)"),
  description: z.string().min(1, "Description is required").max(1000),
  inputSchemaJson: z.string().min(1, "Input schema is required"),
  executionType: z.enum(["mock", "http"]),
  httpUrl: z.string().optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  httpHeadersJson: z.string().optional(),
  mockResponse: z.string().optional(),
  isEnabled: z.boolean(),
});

type ToolFormData = z.infer<typeof toolSchema>;

const defaultInputSchema: ToolInputSchema = {
  type: "object",
  properties: {
    example_param: {
      type: "string",
      description: "An example parameter",
    },
  },
  required: ["example_param"],
};

export default function ToolsPage() {
  const { currentAgent, isLoading: agentLoading } = useAgent();
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [toolAnalytics, setToolAnalytics] = useState<AnalyticsToolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: "",
      description: "",
      inputSchemaJson: JSON.stringify(defaultInputSchema, null, 2),
      executionType: "mock",
      httpUrl: "",
      httpMethod: "GET",
      httpHeadersJson: "{}",
      mockResponse: '{"result": "example response"}',
      isEnabled: true,
    },
  });

  const executionType = form.watch("executionType");

  const fetchTools = useCallback(async () => {
    if (!currentAgent) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [toolsData, analyticsData] = await Promise.all([
        listTools(currentAgent.id),
        getAnalyticsTools(currentAgent.id).catch(() => []),
      ]);
      setTools(toolsData);
      setToolAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to fetch tools:", err);
      toast.error("Failed to load tools");
    } finally {
      setLoading(false);
    }
  }, [currentAgent]);

  useEffect(() => {
    if (!agentLoading && currentAgent) {
      fetchTools();
    } else if (!agentLoading && !currentAgent) {
      setLoading(false);
    }
  }, [agentLoading, currentAgent, fetchTools]);

  const handleNew = () => {
    setEditing("new");
    form.reset({
      name: "",
      description: "",
      inputSchemaJson: JSON.stringify(defaultInputSchema, null, 2),
      executionType: "mock",
      httpUrl: "",
      httpMethod: "GET",
      httpHeadersJson: "{}",
      mockResponse: '{"result": "example response"}',
      isEnabled: true,
    });
  };

  const handleEdit = async (id: string) => {
    try {
      const tool = await getTool(id);
      setEditing(id);
      form.reset({
        name: tool.name,
        description: tool.description,
        inputSchemaJson: JSON.stringify(tool.inputSchema, null, 2),
        executionType: tool.executionType,
        httpUrl: tool.httpUrl || "",
        httpMethod: (tool.httpMethod as "GET" | "POST" | "PUT" | "DELETE") || "GET",
        httpHeadersJson: tool.httpHeaders ? JSON.stringify(tool.httpHeaders, null, 2) : "{}",
        mockResponse: tool.mockResponse || "",
        isEnabled: tool.isEnabled,
      });
    } catch (err) {
      console.error("Failed to load tool:", err);
      toast.error("Failed to load tool");
    }
  };

  const handleCancel = () => {
    setEditing(null);
    form.reset();
  };

  const onSubmit = async (data: ToolFormData) => {
    if (!currentAgent) return;
    setSaving(true);

    try {
      // Parse JSON fields
      let inputSchema: ToolInputSchema;
      try {
        inputSchema = JSON.parse(data.inputSchemaJson);
        if (inputSchema.type !== "object" || !inputSchema.properties) {
          throw new Error("Invalid schema structure");
        }
      } catch {
        toast.error("Invalid input schema JSON");
        setSaving(false);
        return;
      }

      let httpHeaders: Record<string, string> | undefined;
      if (data.executionType === "http" && data.httpHeadersJson) {
        try {
          httpHeaders = JSON.parse(data.httpHeadersJson);
        } catch {
          toast.error("Invalid HTTP headers JSON");
          setSaving(false);
          return;
        }
      }

      const toolData = {
        name: data.name,
        description: data.description,
        inputSchema,
        executionType: data.executionType,
        httpUrl: data.executionType === "http" ? data.httpUrl : null,
        httpMethod: data.executionType === "http" ? data.httpMethod : null,
        httpHeaders: data.executionType === "http" ? httpHeaders : null,
        mockResponse: data.executionType === "mock" ? data.mockResponse : null,
        isEnabled: data.isEnabled,
      };

      if (editing === "new") {
        await createTool({
          ...toolData,
          agentId: currentAgent.id,
        });
        toast.success("Tool created");
      } else if (editing) {
        await updateTool(editing, toolData);
        toast.success("Tool updated");
      }

      setEditing(null);
      form.reset();
      await fetchTools();
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tool?")) return;

    try {
      await deleteTool(id);
      toast.success("Tool deleted");
      await fetchTools();
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Failed to delete tool");
    }
  };

  const handleToggleEnabled = async (tool: AgentTool) => {
    try {
      await updateTool(tool.id, { isEnabled: !tool.isEnabled });
      await fetchTools();
      toast.success(tool.isEnabled ? "Tool disabled" : "Tool enabled");
    } catch (err) {
      console.error("Failed to toggle:", err);
      toast.error("Failed to update tool");
    }
  };

  const renderTools = () => {
    if (loading) {
      return <p className="p-4 text-gray-500">Loading...</p>;
    }

    if (tools.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-2">No tools configured for this agent.</p>
          <p className="text-sm">
            Tools allow your agent to perform actions like fetching data from APIs or returning
            structured responses.
          </p>
        </div>
      );
    }

    return tools.map((tool) => (
      <div key={tool.id} className="flex justify-between items-center p-4 border-b last:border-b-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono font-medium m-0">{tool.name}</p>
            <Badge variant={tool.isEnabled ? "default" : "secondary"}>
              {tool.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="outline">{tool.executionType}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1 m-0">{tool.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {Object.keys(tool.inputSchema.properties || {}).length} parameter(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleToggleEnabled(tool)}>
            {tool.isEnabled ? "Disable" : "Enable"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(tool.id)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(tool.id)}>
            Delete
          </Button>
        </div>
      </div>
    ));
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="m-0 text-2xl font-bold">Agent Tools</h1>
            <p className="text-gray-500 mt-1">
              Configure tools that your agent can use to perform actions
            </p>
          </div>
          {!editing && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
              <Button onClick={handleNew}>Add Tool</Button>
            </div>
          )}
        </div>

        {editing && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 mb-6 space-y-4 border rounded-lg"
            >
              <h2 className="mt-0 mb-4 text-xl font-semibold">
                {editing === "new" ? "New Tool" : "Edit Tool"}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="get_weather" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription>Lowercase with underscores only</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="executionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mock">Mock (Static Response)</SelectItem>
                          <SelectItem value="http">HTTP (API Call)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this tool does..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The LLM uses this to decide when to call the tool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inputSchemaJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Schema (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"type": "object", "properties": {...}}'
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      JSON Schema defining the tool&apos;s parameters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {executionType === "http" && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="httpMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="DELETE">DELETE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="httpUrl"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.example.com/endpoint" {...field} />
                          </FormControl>
                          <FormDescription>
                            Use {"{"}param{"}"} for URL parameters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="httpHeadersJson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTTP Headers (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"Authorization": "Bearer ..."}'
                            className="min-h-[80px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {executionType === "mock" && (
                <FormField
                  control={form.control}
                  name="mockResponse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mock Response</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"temperature": 72, "conditions": "sunny"}'
                          className="min-h-[100px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use ${"{"}param{"}"} to include input values in the response
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enabled</FormLabel>
                      <FormDescription>
                        Only enabled tools are available to the agent
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Tool"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        <div className="overflow-hidden border rounded-lg">{renderTools()}</div>

        {/* Tool Analytics Section */}
        {toolAnalytics.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Tool Usage Analytics</h2>
            <p className="text-gray-500 mb-4">Last 30 days</p>
            <div className="overflow-hidden border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tool</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Executions</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Success Rate</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {toolAnalytics.map((stat) => (
                    <tr key={stat.toolName} className="border-t">
                      <td className="px-4 py-3 font-mono text-sm">{stat.toolName}</td>
                      <td className="px-4 py-3 text-right text-sm">{stat.executionCount}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span
                          className={
                            stat.successRate >= 0.9
                              ? "text-green-600"
                              : stat.successRate >= 0.7
                                ? "text-yellow-600"
                                : "text-red-600"
                          }
                        >
                          {(stat.successRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{stat.avgExecutionTimeMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
