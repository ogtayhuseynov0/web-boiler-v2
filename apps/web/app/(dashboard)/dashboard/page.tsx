"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, MessageSquare, Brain, Mic } from "lucide-react";
import { profileApi, Profile, memoriesApi, callsApi } from "@/lib/api-client";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ memories: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [profileRes, memoriesRes, callsRes] = await Promise.all([
        profileApi.get(),
        memoriesApi.list({ limit: 1 }),
        callsApi.list({ limit: 1 }),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
      setStats({
        memories: memoriesRes.data?.total || 0,
        sessions: callsRes.data?.total || 0,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your Memoir</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.preferred_name || profile?.full_name || "there"}. Ready to capture more of your story?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stories Captured</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memories}</div>
            <p className="text-xs text-muted-foreground">memories from your life</p>
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
            <div className="text-2xl font-bold">Building...</div>
            <p className="text-xs text-muted-foreground">keep sharing to grow it</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start Sharing Your Story</CardTitle>
          <CardDescription>
            Talk or type to capture your memories, experiences, and life moments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Every conversation helps build your personal memoir. Share stories about your childhood,
            career, relationships, travels, or any moments that matter to you.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/calls">
                <Mic className="mr-2 h-4 w-4" />
                Start Talking
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/memories">
                <Brain className="mr-2 h-4 w-4" />
                View Memories
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
