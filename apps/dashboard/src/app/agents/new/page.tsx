"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INSTRUCTIONS } from "@/lib/agent";
import { useAgents } from "@/lib/agent-context";
import { type AgentLimits, createAgent, getAgentLimits, getSupportedModels } from "@/lib/api";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(100),
  systemPrompt: z.string().min(1, "System prompt is required"),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function NewAgentPage() {
  const router = useRouter();
  const { refetchAgents, setCurrentAgent } = useAgents();
  const [models, setModels] = useState<string[]>([]);
  const [limits, setLimits] = useState<AgentLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInstruction, setSelectedInstruction] = useState("");

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      model: "claude-sonnet-4-20250514",
      temperature: 50,
      systemPrompt: "You are a helpful assistant.",
    },
  });

  const temperature = form.watch("temperature");

  const fetchData = useCallback(async () => {
    try {
      const [modelsData, limitsData] = await Promise.all([getSupportedModels(), getAgentLimits()]);
      setModels(modelsData);
      setLimits(limitsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      const newAgent = await createAgent({
        ...data,
        isDefault: false,
      });
      await refetchAgents();
      setCurrentAgent(newAgent);
      toast.success("Agent created successfully");
      router.push("/agents");
    } catch (err) {
      console.error("Failed to create agent:", err);
      const message = err instanceof Error ? err.message : "Failed to create agent";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-2xl p-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (limits && !limits.canCreate) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-2xl p-8 mx-auto">
          <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="mb-6 text-2xl font-bold">Agent Limit Reached</h1>

          <div className="p-6 border rounded-lg bg-amber-50 border-amber-200">
            <p className="mb-4 text-amber-800">
              You've reached your limit of {limits.limit} agent
              {limits.limit === 1 ? "" : "s"} on your current plan.
            </p>
            <p className="mb-6 text-amber-700">Upgrade to Pro to create up to 3 agents.</p>
            <Button onClick={() => router.push("/billing")}>Upgrade Plan</Button>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl p-8 mx-auto">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="mb-6 text-2xl font-bold">Create New Agent</h1>

        {limits && limits.limit !== null && (
          <p className="mb-6 text-sm text-muted-foreground">
            {limits.current}/{limits.limit} agents used
          </p>
        )}

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Assistant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(() => {
                        const cloudModels = ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
                        const localModels = models.filter((m) => !cloudModels.includes(m));
                        const availableCloudModels = models.filter((m) => cloudModels.includes(m));

                        return (
                          <>
                            {localModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Local Models</SelectLabel>
                                {localModels.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {availableCloudModels.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>{localModels.length > 0 ? "Cloud Models" : "Models"}</SelectLabel>
                                {availableCloudModels.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Field>
              <FieldLabel htmlFor="temperature">
                Temperature: {temperature / 100} (
                {temperature < 30 ? "Reserved" : temperature > 70 ? "Creative" : "Balanced"})
              </FieldLabel>
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full"
                  />
                )}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="instructionTemplate">Instruction Template</FieldLabel>
              <Select
                value={selectedInstruction}
                onValueChange={(value) => {
                  setSelectedInstruction(value);
                  const instruction = INSTRUCTIONS.find((i) => i.name === value);
                  if (instruction) {
                    form.setValue("systemPrompt", instruction.content);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an instruction template..." />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUCTIONS.map((instruction) => (
                    <SelectItem key={instruction.name} value={instruction.name}>
                      {instruction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Choose a template to quickly populate the system prompt
              </FieldDescription>
            </Field>

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt (Instructions)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful assistant..."
                      className="min-h-[150px]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedInstruction("");
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AuthenticatedLayout>
  );
}
