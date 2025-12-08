"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, MessageSquare, Brain, Mic, List } from "lucide-react";
import { profileApi, Profile, memoirApi, callsApi } from "@/lib/api-client";
import { ChatInterface } from "@/components/chat/chat-interface";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ stories: 0, chapters: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [profileRes, chaptersRes, callsRes] = await Promise.all([
      profileApi.get(),
      memoirApi.getChapters(),
      callsApi.list({ limit: 1 }),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
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

      {/* Main Content - Chat fills remaining space */}
      <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 py-0 pt-4">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Share Your Story</CardTitle>
              <CardDescription>
                Type or talk to capture your memories, experiences, and life moments.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ChatInterface onNewMemories={handleNewStories} className="border-0 shadow-none rounded-none h-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/calls">
                  <Mic className="mr-2 h-4 w-4" />
                  Voice Session
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/chapters">
                  <List className="mr-2 h-4 w-4" />
                  View Chapters
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/memoir">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Your Memoir
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Story Prompts</CardTitle>
              <CardDescription className="text-xs">
                Need inspiration? Try one of these
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="italic">&quot;What&apos;s your earliest childhood memory?&quot;</p>
              <p className="italic">&quot;Tell me about your grandparents.&quot;</p>
              <p className="italic">&quot;What was your first job like?&quot;</p>
              <p className="italic">&quot;Describe a moment that changed your life.&quot;</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
