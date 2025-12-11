"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, MessageSquare, Brain, Mic, Plus, X, Sparkles } from "lucide-react";
import { profileApi, Profile, memoirApi, callsApi } from "@/lib/api-client";
import { ChatInterface } from "@/components/chat/chat-interface";
import { VoiceCall } from "@/components/voice-call";

const SUGGESTED_TOPICS = [
  "Childhood memories",
  "Family traditions",
  "Career milestones",
  "Travel adventures",
  "Life lessons",
  "Relationships",
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ stories: 0, chapters: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [savingTopics, setSavingTopics] = useState(false);

  const fetchData = useCallback(async () => {
    const [profileRes, chaptersRes, callsRes, topicsRes] = await Promise.all([
      profileApi.get(),
      memoirApi.getChapters(),
      callsApi.list({ limit: 1 }),
      profileApi.getFocusTopics(),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
    }
    if (topicsRes.data?.topics) {
      setFocusTopics(topicsRes.data.topics);
    }

    const chapters = chaptersRes.data?.chapters || [];
    const totalStories = chapters.reduce((sum, c) => sum + (c.stories?.length || 0), 0);
    const chaptersWithStories = chapters.filter(c => c.stories && c.stories.length > 0).length;

    setStats({
      stories: totalStories,
      chapters: chaptersWithStories,
      sessions: callsRes.data?.total || 0,
    });
    setLoading(false);
  }, []);

  const handleAddTopic = async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed || focusTopics.includes(trimmed)) return;

    setSavingTopics(true);
    const newTopics = [...focusTopics, trimmed];
    const res = await profileApi.updateFocusTopics(newTopics);
    if (res.data?.topics) {
      setFocusTopics(res.data.topics);
    }
    setNewTopic("");
    setSavingTopics(false);
  };

  const handleRemoveTopic = async (topic: string) => {
    setSavingTopics(true);
    const newTopics = focusTopics.filter((t) => t !== topic);
    const res = await profileApi.updateFocusTopics(newTopics);
    if (res.data?.topics) {
      setFocusTopics(res.data.topics);
    }
    setSavingTopics(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNewStories = useCallback(() => {
    // Refresh stats when new stories might have been created
    setTimeout(() => {
      memoirApi.getChapters().then((res) => {
        if (res.data?.chapters) {
          const chapters = res.data.chapters;
          const totalStories = chapters.reduce((sum, c) => sum + (c.stories?.length || 0), 0);
          setStats((prev) => ({ ...prev, stories: totalStories }));
        }
      });
    }, 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-bold">Your Memoir</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.preferred_name || profile?.full_name || "there"}. Ready to capture more of your story?
        </p>
      </div>

      {/* Stats Cards */}
      <div className="flex-shrink-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stories Captured</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stories}</div>
            <p className="text-xs text-muted-foreground">across {stats.chapters} chapters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessions}</div>
            <p className="text-xs text-muted-foreground">storytelling conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Memoir</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stories > 0 ? "Growing" : "Empty"}</div>
            <p className="text-xs text-muted-foreground">keep sharing to grow it</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Chat/Voice fills remaining space */}
      <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 py-0 pt-4">
            <CardHeader className="flex-shrink-0 pb-2">
              <CardTitle>Share Your Story</CardTitle>
              <CardDescription>
                Type or talk to capture your memories, experiences, and life moments.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
              <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pb-2">
                  <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="voice" className="gap-2">
                      <Mic className="h-4 w-4" />
                      Voice
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chat" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                  <ChatInterface onNewMemories={handleNewStories} className="border-0 shadow-none rounded-none h-full" />
                </TabsContent>
                <TabsContent value="voice" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                  <div className="flex items-center justify-center h-full p-6">
                    <VoiceCall onCallEnd={() => handleNewStories()} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Story Focus
              </CardTitle>
              <CardDescription className="text-xs">
                Topics to prioritize when extracting stories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {focusTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {focusTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="gap-1 pr-1">
                      {topic}
                      <button
                        onClick={() => handleRemoveTopic(topic)}
                        disabled={savingTopics}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add topic..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTopic(newTopic)}
                  className="h-8 text-sm"
                  disabled={savingTopics}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddTopic(newTopic)}
                  disabled={!newTopic.trim() || savingTopics}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {focusTopics.length < 3 && (
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_TOPICS.filter((t) => !focusTopics.includes(t))
                    .slice(0, 4)
                    .map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleAddTopic(topic)}
                        disabled={savingTopics}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + {topic}
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
