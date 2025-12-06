"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, Trash2, Loader2 } from "lucide-react";
import { memoriesApi, Memory } from "@/lib/api-client";
import { toast } from "sonner";

const categories = [
  { value: "all", label: "All" },
  { value: "preference", label: "Preferences" },
  { value: "fact", label: "Facts" },
  { value: "task", label: "Tasks" },
  { value: "reminder", label: "Reminders" },
  { value: "relationship", label: "Relationships" },
];

const categoryColors: Record<string, string> = {
  preference: "bg-blue-500/10 text-blue-500",
  fact: "bg-green-500/10 text-green-500",
  task: "bg-orange-500/10 text-orange-500",
  reminder: "bg-purple-500/10 text-purple-500",
  relationship: "bg-pink-500/10 text-pink-500",
  other: "bg-gray-500/10 text-gray-500",
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory]);

  const fetchMemories = async () => {
    setLoading(true);
    const res = await memoriesApi.list({
      category: selectedCategory === "all" ? undefined : selectedCategory,
    });

    if (res.data?.memories) {
      setMemories(res.data.memories);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await memoriesApi.delete(id);
    if (res.data?.success) {
      setMemories(memories.filter((m) => m.id !== id));
      toast.success("Memory deleted");
    } else {
      toast.error("Failed to delete memory");
    }
  };

  const filteredMemories = memories.filter((m) =>
    searchQuery
      ? m.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Memories</h1>
        <p className="text-muted-foreground">
          Information the AI has learned about you from conversations
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Memories</CardTitle>
          <CardDescription>
            These are facts and preferences the AI remembers about you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No memories yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                As you have conversations, the AI will learn and remember important
                information about you. You can view and manage those memories here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <p className="text-sm">{memory.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={categoryColors[memory.category] || categoryColors.other}
                      >
                        {memory.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(memory.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
