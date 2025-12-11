import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicMemoirBook } from "@/components/memoir/public-memoir-book";

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-32.png" alt="Memoir" width={28} height={28} />
            <span className="text-xl font-bold">Memoir</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/memoirs">Browse Memoirs</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Start Yours</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Book */}
      <main className="flex-1 flex flex-col min-h-0 p-4">
        {/* Author info */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={memoir.owner.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium leading-none">
              {memoir.owner.memoir_title || `${memoir.owner.name}'s Memoir`}
            </p>
            <p className="text-sm text-muted-foreground">by {memoir.owner.name}</p>
          </div>
        </div>
        {totalStories === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">This memoir is empty</h2>
              <p className="text-muted-foreground mb-6">
                No stories have been added yet.
              </p>
              <Button asChild>
                <Link href="/memoirs">Browse Other Memoirs</Link>
              </Button>
            </div>
          </div>
        ) : (
          <PublicMemoirBook
            ownerName={memoir.owner.name}
            memoirTitle={memoir.owner.memoir_title}
            chapters={memoir.chapters}
          />
        )}
      </main>

      {/* Footer CTA */}
      <footer className="flex-shrink-0 border-t py-4 bg-muted/30">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Create your own memoir and preserve your life stories forever.
          </p>
          <Button asChild>
            <Link href="/login">Start Free</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
