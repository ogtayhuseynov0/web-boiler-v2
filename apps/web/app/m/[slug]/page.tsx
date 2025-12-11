import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PublicMemoirData {
  owner: {
    name: string;
    avatar_url: string | null;
    memoir_title: string | null;
    memoir_description: string | null;
  };
  chapters: Array<{
    id: string;
    title: string;
    description: string | null;
    time_period_start: string | null;
    time_period_end: string | null;
    stories: Array<{
      id: string;
      title: string | null;
      content: string;
      time_period: string | null;
    }>;
  }>;
}

async function getPublicMemoir(slug: string): Promise<PublicMemoirData | null> {
  try {
    const res = await fetch(`${API_URL}/api/profile/public/memoir/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const memoir = await getPublicMemoir(slug);

  if (!memoir) {
    return {
      title: "Memoir Not Found - Memoir",
    };
  }

  const title = memoir.owner.memoir_title || `${memoir.owner.name}'s Memoir`;
  const description =
    memoir.owner.memoir_description ||
    `Read ${memoir.owner.name}'s life stories and memories.`;

  return {
    title: `${title} - Memoir`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function PublicMemoirPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const memoir = await getPublicMemoir(slug);

  if (!memoir) {
    notFound();
  }

  const totalStories = memoir.chapters.reduce(
    (sum, c) => sum + c.stories.length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Memoir</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/memoirs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Memoirs
              </Link>
            </Button>
            <Button asChild>
              <Link href="/login">Start Your Memoir</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Author Info */}
        <div className="flex flex-col items-center text-center mb-12">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={memoir.owner.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-serif font-bold mb-2">
            {memoir.owner.memoir_title || `${memoir.owner.name}'s Memoir`}
          </h1>
          {memoir.owner.memoir_description && (
            <p className="text-lg text-muted-foreground max-w-2xl">
              {memoir.owner.memoir_description}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            {totalStories} stories across {memoir.chapters.length} chapters
          </p>
        </div>

        {/* Chapters */}
        <div className="space-y-12">
          {memoir.chapters.map((chapter) => (
            <section key={chapter.id}>
              <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-serif font-bold">{chapter.title}</h2>
                {chapter.description && (
                  <p className="text-muted-foreground mt-1">{chapter.description}</p>
                )}
                {chapter.time_period_start && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {chapter.time_period_start}
                    {chapter.time_period_end &&
                      chapter.time_period_end !== chapter.time_period_start &&
                      ` - ${chapter.time_period_end}`}
                  </p>
                )}
              </div>

              <div className="space-y-8">
                {chapter.stories.map((story) => (
                  <Card key={story.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      {story.title && (
                        <CardTitle className="font-serif text-xl">
                          {story.title}
                        </CardTitle>
                      )}
                      {story.time_period && (
                        <p className="text-sm text-muted-foreground">
                          {story.time_period}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-neutral dark:prose-invert max-w-none">
                        {story.content.split("\n\n").map((paragraph, i) => (
                          <p key={i} className="text-foreground leading-relaxed mb-4">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center py-12 border-t">
          <h3 className="text-2xl font-bold mb-4">Create Your Own Memoir</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Preserve your life stories for generations to come. Start sharing
            your memories today with voice, chat, or writing.
          </p>
          <Button size="lg" asChild>
            <Link href="/login">Start Free</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Memoir. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
