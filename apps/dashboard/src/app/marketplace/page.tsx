"use client";

import {
  BookOpen,
  Calculator,
  CloudSun,
  Coins,
  Link,
  Mail,
  Package,
  Search,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMarketplaceTools, type ToolTemplate } from "@/lib/api";

// Map icon names to Lucide components
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-6 h-6" />,
  "cloud-sun": <CloudSun className="w-6 h-6" />,
  calculator: <Calculator className="w-6 h-6" />,
  "book-open": <BookOpen className="w-6 h-6" />,
  link: <Link className="w-6 h-6" />,
  coins: <Coins className="w-6 h-6" />,
  package: <Package className="w-6 h-6" />,
  mail: <Mail className="w-6 h-6" />,
  wrench: <Wrench className="w-6 h-6" />,
};

// Category display names and colors
const categoryInfo: Record<string, { label: string; color: string }> = {
  search: { label: "Search", color: "bg-blue-100 text-blue-800" },
  data: { label: "Data", color: "bg-green-100 text-green-800" },
  productivity: { label: "Productivity", color: "bg-purple-100 text-purple-800" },
  communication: { label: "Communication", color: "bg-orange-100 text-orange-800" },
  ecommerce: { label: "E-commerce", color: "bg-pink-100 text-pink-800" },
};

function ToolCard({ tool }: { tool: ToolTemplate }) {
  const icon = iconMap[tool.icon] || <Wrench className="w-6 h-6" />;
  const category = categoryInfo[tool.category] || {
    label: tool.category,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">{icon}</div>
            <div>
              <CardTitle className="text-lg">{tool.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs rounded-full ${category.color}`}>
                  {category.label}
                </span>
                {tool.isFree ? (
                  <Badge variant="secondary" className="text-xs">
                    Free
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    API Key Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <CardDescription className="flex-1 text-sm">{tool.description}</CardDescription>
        <div className="pt-4 mt-4 border-t">
          <Button className="w-full" asChild>
            <a href={`/marketplace/${tool.slug}`}>View Details</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [tools, setTools] = useState<ToolTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTools() {
      try {
        const data = await listMarketplaceTools();
        setTools(data);
      } catch (err) {
        console.error("Failed to fetch tools:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTools();
  }, []);

  // Get unique categories
  const categories = [...new Set(tools.map((t) => t.category))];

  // Filter tools
  const filteredTools = filter ? tools.filter((t) => t.category === filter) : tools;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-12 mx-auto px-4">
          <p className="text-center text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-12 mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Tool Marketplace</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Extend your AI agent with powerful integrations. Browse our collection of pre-built
              tools and add them to your agents with just a few clicks.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8 mx-auto px-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={filter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(null)}
          >
            All Tools
          </Button>
          {categories.map((cat) => {
            const info = categoryInfo[cat] || { label: cat };
            return (
              <Button
                key={cat}
                variant={filter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(cat)}
              >
                {info.label}
              </Button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No tools found in this category.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="container py-8 mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Want to add a custom tool?{" "}
            <a href="/tools" className="text-primary hover:underline">
              Create your own
            </a>{" "}
            in the Tools section.
          </p>
        </div>
      </div>
    </div>
  );
}
