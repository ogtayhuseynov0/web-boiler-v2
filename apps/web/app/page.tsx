import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Mic,
  Brain,
  Heart,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Memoir</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Start Your Memoir</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                <Sparkles className="h-4 w-4" />
                Your life story, beautifully preserved
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
                Turn Your Memories Into a{" "}
                <span className="text-primary">Living Memoir</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Just talk. Share your stories, experiences, and memories through
                natural conversation. Our AI listens, remembers, and transforms
                your words into a beautiful memoir you can treasure forever.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 h-14" asChild>
                  <Link href="/login">
                    Start Your Memoir
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 h-14"
                  asChild
                >
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
            </div>

            {/* Book Preview */}
            <div className="mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-8 md:p-12 shadow-2xl border max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl text-amber-900 dark:text-amber-100">
                      Chapter 3: Summer of &apos;85
                    </h3>
                    <p className="font-serif text-amber-800 dark:text-amber-200 leading-relaxed">
                      That summer changed everything. I remember the smell of
                      fresh cut grass and the sound of cicadas as we drove down
                      to Grandma&apos;s farm for what would be the last time...
                    </p>
                    <p className="font-serif text-amber-800 dark:text-amber-200 leading-relaxed">
                      She taught me how to make her famous apple pie that week.
                      &quot;The secret,&quot; she said, &quot;is patience and a
                      little bit of love.&quot;
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="font-serif text-amber-800 dark:text-amber-200 leading-relaxed">
                      I still make that pie every Thanksgiving. And every time,
                      I&apos;m back in that warm kitchen, flour on my nose,
                      listening to her stories about the old country.
                    </p>
                    <p className="font-serif text-amber-800 dark:text-amber-200 leading-relaxed">
                      Some memories fade, but the ones we cherish? They become
                      part of who we are.
                    </p>
                    <p className="text-right text-sm text-amber-600 dark:text-amber-400 mt-8">
                      — 12 —
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Your Story Deserves to Be Told
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Memoir makes it effortless to capture, preserve, and share your
                life&apos;s most meaningful moments.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Mic className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Just Talk</h3>
                <p className="text-muted-foreground">
                  No typing required. Simply speak naturally and share your
                  stories through voice conversations. It&apos;s like talking to
                  a friend who never forgets.
                </p>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI That Remembers</h3>
                <p className="text-muted-foreground">
                  Our AI captures the details, emotions, and connections in your
                  stories. It asks thoughtful follow-ups and helps you uncover
                  memories you forgot you had.
                </p>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Beautiful Memoir</h3>
                <p className="text-muted-foreground">
                  Watch your stories transform into a beautifully organized
                  memoir. Flip through your life like pages of a book, organized
                  by themes and chapters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground">
                Three simple steps to preserve your legacy
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid gap-12">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Start a Conversation
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Open the app and start talking. Share a memory about your
                      childhood, tell us about your career, or describe your
                      favorite family tradition. There&apos;s no wrong way to
                      start.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      We Listen & Remember
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Our AI companion listens deeply, asks meaningful
                      follow-ups, and captures every detail. Names, places,
                      emotions — everything that makes your story yours.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Your Memoir Grows
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Each conversation adds to your memoir. Over time, your
                      stories weave together into a beautiful, organized book of
                      your life that you can read, share, and treasure forever.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Memoir */}
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why People Love Memoir
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="font-semibold mb-2">For Your Family</h3>
                <p className="text-sm text-muted-foreground">
                  Leave a legacy your children and grandchildren will treasure
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-2">Before They Fade</h3>
                <p className="text-sm text-muted-foreground">
                  Capture precious memories while they&apos;re still vivid
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-2">Effortless</h3>
                <p className="text-sm text-muted-foreground">
                  No writing skills needed — just talk naturally
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-2">Private & Secure</h3>
                <p className="text-sm text-muted-foreground">
                  Your stories are encrypted and completely private
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-card rounded-3xl p-8 md:p-12 border shadow-lg text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <blockquote className="text-2xl md:text-3xl font-medium mb-6 leading-relaxed">
                &quot;I always wanted to write down my life story for my
                grandkids, but never had the time or knew where to start. With
                Memoir, I just talk, and it&apos;s all there. It&apos;s like
                magic.&quot;
              </blockquote>
              <p className="text-muted-foreground">
                — Margaret, 72, Grandmother of 5
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Story Matters
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
              Don&apos;t let your memories fade. Start capturing your life story
              today — it only takes a conversation.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 h-14"
              asChild
            >
              <Link href="/login">
                Start Your Memoir — It&apos;s Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">Memoir</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="mailto:hello@memoir.bot" className="hover:text-foreground">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Memoir. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
