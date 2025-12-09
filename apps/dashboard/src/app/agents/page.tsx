"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useAgent } from "@/lib/agent-context";
import { getSupportedModels, updateAgent } from "@/lib/api";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(100),
  systemPrompt: z.string().min(1, "System prompt is required"),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function AgentsPage() {
  const { currentAgent, refetchAgents } = useAgent();
  const [models, setModels] = useState<string[]>([]);
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
    if (!currentAgent) return;
    try {
      const modelsData = await getSupportedModels();
      setModels(modelsData);
      form.reset({
        name: currentAgent.name,
        model: currentAgent.model,
        temperature: currentAgent.temperature,
        systemPrompt: currentAgent.systemPrompt,
      });
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load agent settings");
    } finally {
      setLoading(false);
    }
  }, [form, currentAgent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: AgentFormData) => {
    if (!currentAgent) return;

    try {
      await updateAgent(currentAgent.id, data);
      await refetchAgents();
      toast.success("Agent settings saved");
    } catch (err) {
      console.error("Failed to save agent:", err);
      toast.error("Failed to save settings");
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

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl p-8">
        <h1 className="mb-6 text-2xl font-bold">Agent Settings</h1>

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

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AuthenticatedLayout>
  );
}
