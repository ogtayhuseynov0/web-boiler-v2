"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Brain,
  Search,
  Trash2,
  Loader2,
  Heart,
  Lightbulb,
  CheckSquare,
  Bell,
  Users,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { memoriesApi, Memory } from "@/lib/api-client";
import { toast } from "sonner";

const categories = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "preference", label: "Preferences", icon: Heart },
  { value: "fact", label: "Facts", icon: Lightbulb },
  { value: "task", label: "Tasks", icon: CheckSquare },
  { value: "reminder", label: "Reminders", icon: Bell },
  { value: "relationship", label: "Relationships", icon: Users },
];

const categoryConfig: Record<
  string,
  { color: string; bgColor: string; icon: typeof Brain }
> = {
  preference: {
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    icon: Heart,
  },
  fact: {
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    icon: Lightbulb,
  },
  task: {
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
    icon: CheckSquare,
  },
  reminder: {
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    icon: Bell,
  },
  relationship: {
    color: "text-pink-500",
    bgColor: "bg-pink-500/10 border-pink-500/20",
    icon: Users,
  },
  other: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: Brain,
  },
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deleteMemoryId, setDeleteMemoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteMemoryId) return;

    setDeleting(true);
    const res = await memoriesApi.delete(deleteMemoryId);
    if (res.data?.success) {
      setMemories(memories.filter((m) => m.id !== deleteMemoryId));
      toast.success("Memory deleted");
    } else {
      toast.error("Failed to delete memory");
    }
    setDeleting(false);
    setDeleteMemoryId(null);
  };

  const filteredMemories = memories.filter((m) =>
    searchQuery
      ? m.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Count memories by category
  const categoryCounts = memories.reduce(
    (acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Memories</h1>
            <p className="text-muted-foreground mt-1">
              What the AI has learned about you from conversations
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-5 w-5" />
            <span className="font-medium">{memories.length} memories</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex-shrink-0 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.value;
            const count =
              category.value === "all"
                ? memories.length
                : categoryCounts[category.value] || 0;
            const Icon = category.icon;

            return (
              <Button
                key={category.value}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {category.label}
                {count > 0 && (
                  <span
                    className={`ml-1 text-xs ${isSelected ? "opacity-80" : "text-muted-foreground"}`}
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Memories List */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedCategory === "all"
                  ? "All Memories"
                  : categories.find((c) => c.value === selectedCategory)
                      ?.label || "Memories"}
              </CardTitle>
              <CardDescription>
                {filteredMemories.length === 0
                  ? "No memories found"
                  : `${filteredMemories.length} ${filteredMemories.length === 1 ? "memory" : "memories"}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">
                {searchQuery ? "No matching memories" : "No memories yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Start a conversation and the AI will remember important details about you automatically."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 h-full overflow-y-auto overflow-x-hidden pr-1">
              {filteredMemories.map((memory) => {
                const config =
                  categoryConfig[memory.category] || categoryConfig.other;
                const Icon = config.icon;

                return (
                  <div
                    key={memory.id}
                    className={`group flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 ${config.bgColor}`}
                  >
                    <div
                      className={`flex-shrink-0 rounded-lg p-2 ${config.color} bg-background`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{memory.content}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-normal ${config.color} bg-transparent px-0`}
                        >
                          {memory.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(memory.created_at)}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => setDeleteMemoryId(memory.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteMemoryId}
        onOpenChange={() => setDeleteMemoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this memory. The AI will no longer
              remember this information about you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
