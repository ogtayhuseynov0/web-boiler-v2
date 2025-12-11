import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PublicMemoirListItem {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  memoir_title: string | null;
  memoir_description: string | null;
  memoir_share_slug: string;
  updated_at: string;
}

export const metadata: Metadata = {
  title: "Public Memoirs - Memoir",
  description: "Explore public life stories and memoirs from our community.",
};

async function getPublicMemoirs(): Promise<{ memoirs: PublicMemoirListItem[]; total: number }> {
  try {
    const res = await fetch(`${API_URL}/api/profile/public/memoirs?limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return { memoirs: [], total: 0 };
    return res.json();
  } catch {
    return { memoirs: [], total: 0 };
  }
}

export default async function PublicMemoirsPage() {
  const { memoirs, total } = await getPublicMemoirs();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-256.png" alt="Memoir" width={28} height={28} />
            <span className="text-xl font-bold">Memoir</span>
          </Link>
          <Button asChild>
            <Link href="/login">Start Your Memoir</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Public Memoirs</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore life stories shared by our community. Each memoir is a
            unique collection of memories, experiences, and wisdom.
          </p>
          {total > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {total} public {total === 1 ? "memoir" : "memoirs"}
            </p>
          )}
        </div>

        {/* Memoirs Grid */}
        {memoirs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {memoirs.map((memoir) => {
              const name = memoir.preferred_name || memoir.full_name || "Anonymous";
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card key={memoir.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={memoir.avatar_url || undefined} />
                        <AvatarFallback>{initials || <User className="h-4 w-4" />}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate text-lg">
                          {memoir.memoir_title || `${name}'s Memoir`}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">by {name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memoir.memoir_description ? (
                      <CardDescription className="line-clamp-3 mb-4">
                        {memoir.memoir_description}
                      </CardDescription>
                    ) : (
                      <CardDescription className="mb-4">
                        A collection of life stories and memories.
                      </CardDescription>
                    )}
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/m/${memoir.memoir_share_slug}`}>
                        Read Memoir
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No public memoirs yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to share your story with the world!
            </p>
            <Button asChild>
              <Link href="/login">Create Your Memoir</Link>
            </Button>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-2xl font-bold mb-4">Share Your Story</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join our community and preserve your life stories for generations
            to come. Start sharing your memories with voice, chat, or writing.
          </p>
          <Button size="lg" asChild>
            <Link href="/login">Start Free</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Memoir. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
