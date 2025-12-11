"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, BookOpen, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { memoirApi, MemoirChapter, ChapterStory } from "@/lib/api-client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function ChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<MemoirChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<ChapterStory | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [storyTitle, setStoryTitle] = useState("");
  const [storyContent, setStoryContent] = useState("");
  const [storyTimePeriod, setStoryTimePeriod] = useState("");

  useEffect(() => {
    const fetchChapter = async () => {
      const res = await memoirApi.getChapter(chapterId);
      if (res.data?.chapter) {
        setChapter(res.data.chapter);
      } else {
        router.push("/chapters");
      }
      setLoading(false);
    };
    fetchChapter();
  }, [chapterId, router]);

  const resetForm = () => {
    setStoryTitle("");
    setStoryContent("");
    setStoryTimePeriod("");
    setEditingStory(null);
  };

  const handleAddStory = async () => {
    if (!storyContent.trim()) {
      toast.error("Story content is required");
      return;
    }

    setSaving(true);
    const res = await memoirApi.createStory({
      chapter_id: chapterId,
      title: storyTitle.trim() || undefined,
      content: storyContent.trim(),
      time_period: storyTimePeriod.trim() || undefined,
    });

    if (res.data?.story) {
      toast.success("Story added");
      setChapter((prev) =>
        prev ? { ...prev, stories: [...prev.stories, res.data!.story] } : prev
      );
      setAddDialogOpen(false);
      resetForm();
    } else {
      toast.error(res.error || "Failed to add story");
    }
    setSaving(false);
  };

  const handleEditStory = async () => {
    if (!editingStory || !storyContent.trim()) {
      toast.error("Story content is required");
      return;
    }

    setSaving(true);
    const res = await memoirApi.updateStory(editingStory.id, {
      title: storyTitle.trim() || undefined,
      content: storyContent.trim(),
      time_period: storyTimePeriod.trim() || undefined,
    });

    if (res.data?.story) {
      toast.success("Story updated");
      setChapter((prev) =>
        prev
          ? {
              ...prev,
              stories: prev.stories.map((s) =>
                s.id === editingStory.id ? res.data!.story : s
              ),
            }
          : prev
      );
      setEditingStory(null);
      resetForm();
    } else {
      toast.error(res.error || "Failed to update story");
    }
    setSaving(false);
  };

  const handleDeleteStory = async (storyId: string) => {
    const res = await memoirApi.deleteStory(storyId);
    if (res.data?.success) {
      toast.success("Story deleted");
      setChapter((prev) =>
        prev ? { ...prev, stories: prev.stories.filter((s) => s.id !== storyId) } : prev
      );
    } else {
      toast.error(res.error || "Failed to delete story");
    }
  };

  const openEditDialog = (story: ChapterStory) => {
    setEditingStory(story);
    setStoryTitle(story.title || "");
    setStoryContent(story.content);
    setStoryTimePeriod(story.time_period || "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chapter) {
    return null;
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex-shrink-0">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/chapters")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chapters
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{chapter.title}</h1>
            {chapter.description && (
              <p className="text-muted-foreground mt-1">{chapter.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {chapter.stories.length} {chapter.stories.length === 1 ? "story" : "stories"}
              {chapter.time_period_start && (
                <span>
                  {" "}
                  &middot; {chapter.time_period_start}
                  {chapter.time_period_end && chapter.time_period_end !== chapter.time_period_start
                    ? ` - ${chapter.time_period_end}`
                    : ""}
                </span>
              )}
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Story
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Story</DialogTitle>
                <DialogDescription>
                  Add a new story to the &quot;{chapter.title}&quot; chapter
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Title (optional)</label>
                  <Input
                    placeholder="A brief title for your story"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time Period (optional)</label>
                  <Input
                    placeholder="e.g., 1990s, childhood, college years"
                    value={storyTimePeriod}
                    onChange={(e) => setStoryTimePeriod(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Story Content</label>
                  <Textarea
                    placeholder="Write your story here..."
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    rows={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStory} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Story
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stories List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {chapter.stories.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No stories yet</h3>
            <p className="text-muted-foreground mt-2">
              Add your first story to this chapter
            </p>
          </Card>
        ) : (
          chapter.stories.map((story) => (
            <Card key={story.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {story.title && <CardTitle className="text-lg">{story.title}</CardTitle>}
                      {story.source_type === "guest" && (
                        <Badge variant="secondary" className="gap-1">
                          <UserPlus className="h-3 w-3" />
                          Guest
                        </Badge>
                      )}
                    </div>
                    {story.time_period && (
                      <CardDescription>{story.time_period}</CardDescription>
                    )}
                    {story.source_type === "guest" && story.summary && (
                      <CardDescription className="text-xs mt-1">{story.summary}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog
                      open={editingStory?.id === story.id}
                      onOpenChange={(open) => {
                        if (!open) resetForm();
                        else openEditDialog(story);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Story</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium">Title (optional)</label>
                            <Input
                              placeholder="A brief title for your story"
                              value={storyTitle}
                              onChange={(e) => setStoryTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Time Period (optional)</label>
                            <Input
                              placeholder="e.g., 1990s, childhood, college years"
                              value={storyTimePeriod}
                              onChange={(e) => setStoryTimePeriod(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Story Content</label>
                            <Textarea
                              placeholder="Write your story here..."
                              value={storyContent}
                              onChange={(e) => setStoryContent(e.target.value)}
                              rows={10}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => resetForm()}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditStory} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Story</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this story? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteStory(story.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="text-foreground leading-relaxed mb-3">{children}</p>
                      ),
                    }}
                  >
                    {story.content}
                  </ReactMarkdown>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Source: {story.source_type}</span>
                  <span>{new Date(story.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
