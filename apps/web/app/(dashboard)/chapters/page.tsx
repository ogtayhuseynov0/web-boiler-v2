"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Plus, ChevronRight } from "lucide-react";
import { memoirApi, MemoirChapter } from "@/lib/api-client";
import Link from "next/link";

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<MemoirChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      const res = await memoirApi.getChapters();
      if (res.data?.chapters) {
        setChapters(res.data.chapters);
      }
      setLoading(false);
    };
    fetchChapters();
  }, []);

  const totalStories = chapters.reduce((sum, c) => sum + (c.stories?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chapters</h1>
          <p className="text-muted-foreground mt-1">
            {chapters.length} chapters with {totalStories} stories
          </p>
        </div>
        <Button asChild>
          <Link href="/memoir">
            <BookOpen className="h-4 w-4 mr-2" />
            View Memoir
          </Link>
        </Button>
      </div>

      {/* Chapters Grid */}
      <div className="flex-1 overflow-y-auto">
        {chapters.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No chapters yet</h3>
            <p className="text-muted-foreground mt-2">
              Start sharing your stories to create your memoir
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map((chapter) => (
              <Link key={chapter.id} href={`/chapters/${chapter.id}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{chapter.title}</CardTitle>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {chapter.description && (
                      <CardDescription className="line-clamp-2">
                        {chapter.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {chapter.stories?.length || 0} {(chapter.stories?.length || 0) === 1 ? "story" : "stories"}
                      </span>
                      {chapter.time_period_start && (
                        <span className="text-muted-foreground">
                          {chapter.time_period_start}
                          {chapter.time_period_end && chapter.time_period_end !== chapter.time_period_start
                            ? ` - ${chapter.time_period_end}`
                            : ""}
                        </span>
                      )}
                    </div>
                    {chapter.stories && chapter.stories.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chapter.stories[0].title || chapter.stories[0].content.substring(0, 100)}...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
