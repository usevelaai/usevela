"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAgent } from "@/lib/agent-context";
import {
  createWebSource,
  deleteWebSource,
  deleteWebSourcePage,
  getWebSource,
  listWebSources,
  recrawlWebSource,
  toggleWebSourcePageExclusion,
  type WebSource,
  type WebSourcePage,
} from "@/lib/api";

const webSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  sourceType: z.enum(["individual", "sitemap", "crawl"]),
});

type WebSourceFormData = z.infer<typeof webSourceSchema>;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    crawling: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

function SourceTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "individual":
      return <FileText className="w-4 h-4" />;
    case "sitemap":
      return <Link2 className="w-4 h-4" />;
    case "crawl":
      return <Globe className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
}

export default function WebSourcesPage() {
  const { currentAgent, isLoading: agentLoading } = useAgent();
  const [sources, setSources] = useState<WebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [sourcePages, setSourcePages] = useState<Record<string, WebSourcePage[]>>({});
  const [loadingPages, setLoadingPages] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<WebSourcePage | null>(null);

  const form = useForm<WebSourceFormData>({
    resolver: zodResolver(webSourceSchema),
    defaultValues: {
      name: "",
      url: "",
      sourceType: "individual",
    },
  });

  const fetchSources = useCallback(async () => {
    if (!currentAgent) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listWebSources(currentAgent.id);
      setSources(data);
    } catch (err) {
      console.error("Failed to fetch web sources:", err);
      toast.error("Failed to load web sources");
    } finally {
      setLoading(false);
    }
  }, [currentAgent]);

  useEffect(() => {
    if (!agentLoading && currentAgent) {
      fetchSources();
    } else if (!agentLoading && !currentAgent) {
      setLoading(false);
    }
  }, [agentLoading, currentAgent, fetchSources]);

  const toggleExpanded = async (sourceId: string) => {
    if (expandedSource === sourceId) {
      setExpandedSource(null);
      return;
    }

    setExpandedSource(sourceId);

    // Load pages if not already loaded
    if (!sourcePages[sourceId]) {
      setLoadingPages(sourceId);
      try {
        const data = await getWebSource(sourceId);
        setSourcePages((prev) => ({ ...prev, [sourceId]: data.pages }));
      } catch (err) {
        console.error("Failed to load pages:", err);
        toast.error("Failed to load pages");
      } finally {
        setLoadingPages(null);
      }
    }
  };

  const onSubmit = async (data: WebSourceFormData) => {
    if (!currentAgent) return;
    setSaving(true);

    try {
      await createWebSource(currentAgent.id, data.name, data.url, data.sourceType);
      setShowAddDialog(false);
      form.reset();
      toast.success("Web source added. Crawling will begin shortly.");
      await fetchSources();
    } catch (err) {
      console.error("Failed to create web source:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add web source");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this web source and all its pages?")) return;

    try {
      await deleteWebSource(id);
      toast.success("Web source deleted");
      await fetchSources();
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Failed to delete web source");
    }
  };

  const handleRecrawl = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await recrawlWebSource(id);
      toast.success("Recrawl started");
      await fetchSources();
    } catch (err) {
      console.error("Failed to recrawl:", err);
      toast.error("Failed to start recrawl");
    }
  };

  const handleToggleExclusion = async (sourceId: string, page: WebSourcePage) => {
    try {
      await toggleWebSourcePageExclusion(sourceId, page.id, !page.isExcluded);
      setSourcePages((prev) => ({
        ...prev,
        [sourceId]: prev[sourceId].map((p) =>
          p.id === page.id ? { ...p, isExcluded: !p.isExcluded } : p,
        ),
      }));
      toast.success(page.isExcluded ? "Page included" : "Page excluded");
    } catch (err) {
      console.error("Failed to toggle exclusion:", err);
      toast.error("Failed to update page");
    }
  };

  const handleDeletePage = async (sourceId: string, pageId: string) => {
    if (!confirm("Delete this page?")) return;

    try {
      await deleteWebSourcePage(sourceId, pageId);
      setSourcePages((prev) => ({
        ...prev,
        [sourceId]: prev[sourceId].filter((p) => p.id !== pageId),
      }));
      toast.success("Page deleted");
    } catch (err) {
      console.error("Failed to delete page:", err);
      toast.error("Failed to delete page");
    }
  };

  const renderSources = () => {
    if (loading) {
      return (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (sources.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="mb-4">No web sources yet.</p>
          <Button onClick={() => setShowAddDialog(true)}>Add Web Source</Button>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {sources.map((source) => (
          <div key={source.id}>
            <button
              type="button"
              className="w-full p-4 cursor-pointer hover:bg-gray-50 transition-colors text-left"
              onClick={() => toggleExpanded(source.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-1">
                    {expandedSource === source.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                  <SourceTypeIcon type={source.sourceType} />
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="truncate max-w-[300px]">{source.url}</span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-500">
                    <p>{source.pageCount ?? 0} pages</p>
                    <p>{formatBytes(source.totalSize ?? 0)}</p>
                  </div>
                  <StatusBadge status={source.status} />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleRecrawl(source.id, e)}
                      disabled={source.status === "crawling"}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${source.status === "crawling" ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(source.id, e)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded Pages List */}
            {expandedSource === source.id && (
              <div className="bg-gray-50 border-t">
                {loadingPages === source.id ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                ) : sourcePages[source.id]?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No pages crawled yet</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {sourcePages[source.id]?.map((page) => (
                      <div
                        key={page.id}
                        className={`p-3 pl-12 flex items-center justify-between text-sm ${page.isExcluded ? "opacity-50" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{page.title || page.url}</p>
                          <p className="text-gray-500 truncate">{page.url}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className="text-gray-500">{formatBytes(page.contentSize)}</span>
                          <StatusBadge status={page.status} />
                          <span className="text-gray-400 text-xs">
                            {page.lastCrawledAt
                              ? new Date(page.lastCrawledAt).toLocaleDateString()
                              : "-"}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewingContent(page)}
                              disabled={!page.content}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleExclusion(source.id, page)}
                            >
                              {page.isExcluded ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeletePage(source.id, page.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="m-0 text-2xl font-bold">Web Sources</h1>
            <p className="text-gray-500 mt-1">Add websites to train your agent with web content</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>Add Web Source</Button>
        </div>

        <div className="border rounded-lg bg-white overflow-hidden">{renderSources()}</div>
      </div>

      {/* Add Web Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Web Source</DialogTitle>
            <DialogDescription>
              Add a website to crawl and use as training data for your agent
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Website" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>Individual Page</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sitemap">
                          <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            <span>Sitemap</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="crawl">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>Crawl Links</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "individual" && "Fetch content from a single URL"}
                      {field.value === "sitemap" &&
                        "Parse a sitemap.xml to discover and crawl all pages"}
                      {field.value === "crawl" &&
                        "Start from a URL and follow links to crawl related pages"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch("sourceType") === "sitemap"
                            ? "https://example.com/sitemap.xml"
                            : "https://example.com"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Source"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Content Viewer Dialog */}
      <Dialog open={viewingContent !== null} onOpenChange={() => setViewingContent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingContent?.title || "Page Content"}</DialogTitle>
            <DialogDescription className="truncate">{viewingContent?.url}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] p-4 bg-gray-50 rounded-lg font-mono text-sm whitespace-pre-wrap">
            {viewingContent?.content || "No content available"}
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
