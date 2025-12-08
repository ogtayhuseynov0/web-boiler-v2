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
  Quote,
  Feather,
  TreeDeciduous,
  GraduationCap,
  Briefcase,
  Plane,
  Gift,
  Check,
  Star,
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

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <span className="text-sm">Loved by 10,000+ families</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="text-sm">4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Book Preview */}
            <div className="mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
              <div className="bg-card rounded-2xl p-8 md:p-12 shadow-2xl border max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-sm text-muted-foreground font-serif italic">Margaret&apos;s Memoir</span>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl text-foreground">
                      Chapter 3: Summer of &apos;85
                    </h3>
                    <p className="font-serif text-muted-foreground leading-relaxed">
                      That summer changed everything. I remember the smell of
                      fresh cut grass and the sound of cicadas as we drove down
                      to Grandma&apos;s farm for what would be the last time...
                    </p>
                    <p className="font-serif text-muted-foreground leading-relaxed">
                      She taught me how to make her famous apple pie that week.
                      &quot;The secret,&quot; she said, &quot;is patience and a
                      little bit of love.&quot;
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="font-serif text-muted-foreground leading-relaxed">
                      I still make that pie every Thanksgiving. And every time,
                      I&apos;m back in that warm kitchen, flour on my nose,
                      listening to her stories about the old country.
                    </p>
                    <p className="font-serif text-muted-foreground leading-relaxed">
                      Some memories fade, but the ones we cherish? They become
                      part of who we are.
                    </p>
                    <p className="text-right text-sm text-primary/60 mt-8 font-serif">
                      — 12 —
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 border-y bg-muted/20">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
              <div>
                <p className="text-4xl font-bold text-primary mb-2">50,000+</p>
                <p className="text-muted-foreground">Stories Captured</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary mb-2">10,000+</p>
                <p className="text-muted-foreground">Happy Families</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary mb-2">4.9</p>
                <p className="text-muted-foreground">Average Rating</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary mb-2">100+</p>
                <p className="text-muted-foreground">Countries</p>
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
              <div className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Mic className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Just Talk</h3>
                <p className="text-muted-foreground mb-4">
                  No typing required. Simply speak naturally and share your
                  stories through voice conversations. It&apos;s like talking to
                  a friend who never forgets.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Natural conversation flow
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Voice or text input
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    No learning curve
                  </li>
                </ul>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI That Remembers</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI captures the details, emotions, and connections in your
                  stories. It asks thoughtful follow-ups and helps you uncover
                  memories you forgot you had.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Remembers names & places
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Asks thoughtful questions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Connects your stories
                  </li>
                </ul>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Beautiful Memoir</h3>
                <p className="text-muted-foreground mb-4">
                  Watch your stories transform into a beautifully organized
                  memoir. Flip through your life like pages of a book, organized
                  by themes and chapters.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Organized by themes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Beautiful book format
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Export & share
                  </li>
                </ul>
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
              <div className="grid gap-8">
                <div className="flex gap-6 items-start bg-card rounded-2xl p-6 border">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      Start a Conversation
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Open the app and start talking. Share a memory about your
                      childhood, tell us about your career, or describe your
                      favorite family tradition. There&apos;s no wrong way to
                      start.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                      <p className="text-sm italic text-muted-foreground">
                        <Quote className="h-4 w-4 inline mr-2 text-primary" />
                        &quot;I want to tell you about my grandmother. She was the strongest woman I ever knew...&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 items-start bg-card rounded-2xl p-6 border">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      We Listen & Remember
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Our AI companion listens deeply, asks meaningful
                      follow-ups, and captures every detail. Names, places,
                      emotions — everything that makes your story yours.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                      <p className="text-sm italic text-muted-foreground">
                        <Quote className="h-4 w-4 inline mr-2 text-primary" />
                        &quot;That sounds like a beautiful memory. What was her name, and what made her so strong in your eyes?&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 items-start bg-card rounded-2xl p-6 border">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      Your Memoir Grows
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Each conversation adds to your memoir. Over time, your
                      stories weave together into a beautiful, organized book of
                      your life that you can read, share, and treasure forever.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Family</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Childhood</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Wisdom</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Love</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button size="lg" asChild>
                <Link href="/login">
                  Try It Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
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

        {/* Story Prompts Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Every Story Matters
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From childhood adventures to life lessons — every chapter of your life deserves to be remembered
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TreeDeciduous className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Childhood Memories</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The house you grew up in, your first best friend, summer vacations at the lake
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;Tell me about your favorite childhood memory...&quot;
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Family Stories</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your grandparents&apos; immigration journey, family traditions, holiday memories
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;What traditions did your family have...&quot;
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Love & Relationships</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  How you met your spouse, your wedding day, the birth of your children
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;How did you and your partner meet...&quot;
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Career Journey</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your first job, career pivots, mentors who shaped you, proudest achievements
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;What was your first job like...&quot;
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Adventures & Travel</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  That road trip across the country, the year you lived abroad, unexpected adventures
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;Tell me about a trip that changed you...&quot;
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Life Lessons</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Wisdom you&apos;ve gained, challenges you&apos;ve overcome, advice for the future
                </p>
                <p className="text-xs text-primary font-medium italic">
                  &quot;What&apos;s the best advice you&apos;ve ever received...&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Stories From Our Community
              </h2>
              <p className="text-xl text-muted-foreground">
                Thousands of families are preserving their legacies with Memoir
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-lg mb-6 leading-relaxed">
                  &quot;I always wanted to write down my life story for my
                  grandkids, but never had the time or knew where to start. With
                  Memoir, I just talk, and it&apos;s all there. It&apos;s like
                  magic.&quot;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">M</span>
                  </div>
                  <div>
                    <p className="font-medium">Margaret Thompson</p>
                    <p className="text-sm text-muted-foreground">Grandmother of 5</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-lg mb-6 leading-relaxed">
                  &quot;My father was diagnosed with early dementia. We used Memoir
                  to capture his stories before they faded. Now my children will
                  always know who their grandfather was.&quot;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">D</span>
                  </div>
                  <div>
                    <p className="font-medium">David Chen</p>
                    <p className="text-sm text-muted-foreground">Son & Father</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-8 border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-lg mb-6 leading-relaxed">
                  &quot;I gave my mom a Memoir subscription for her 80th birthday.
                  She calls me every week to share what stories she&apos;s added.
                  Best gift I&apos;ve ever given.&quot;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">S</span>
                  </div>
                  <div>
                    <p className="font-medium">Sarah Williams</p>
                    <p className="text-sm text-muted-foreground">Daughter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-muted-foreground">
                Everything you need to know about Memoir
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  Do I need any technical skills to use Memoir?
                </h3>
                <p className="text-muted-foreground">
                  Not at all! Memoir is designed to be as simple as having a conversation.
                  Just speak naturally about your memories, and our AI does the rest. No typing,
                  no formatting, no tech skills required.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  How does Memoir organize my stories?
                </h3>
                <p className="text-muted-foreground">
                  Our AI automatically categorizes your stories by themes like family, career,
                  childhood, relationships, and more. It also identifies connections between
                  your stories to create a cohesive narrative.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  Is my data private and secure?
                </h3>
                <p className="text-muted-foreground">
                  Absolutely. Your stories are encrypted end-to-end and stored securely.
                  We never share your data with third parties. Your memoir is yours alone —
                  you control who can access it.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  Can I share my memoir with family members?
                </h3>
                <p className="text-muted-foreground">
                  Yes! You can invite family members to view your memoir. You can also
                  export your stories as a beautiful PDF book that can be printed or
                  shared digitally.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  What if I don&apos;t know what to talk about?
                </h3>
                <p className="text-muted-foreground">
                  Memoir gently guides you with thoughtful prompts and follow-up questions.
                  You might start with &quot;Tell me about your childhood home&quot; and
                  discover memories you forgot you had. The conversation flows naturally.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">
                  Can I use Memoir for someone else, like a parent?
                </h3>
                <p className="text-muted-foreground">
                  Memoir is perfect for capturing a loved one&apos;s stories.
                  Many of our users set up sessions with their parents or grandparents.
                  It&apos;s a beautiful way to preserve family history across generations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gift Section */}
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto bg-card rounded-3xl p-8 md:p-12 border shadow-lg">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Gift className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">
                    The Perfect Gift for Parents & Grandparents
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Give the gift of preserved memories. A Memoir subscription is
                    a meaningful way to show you care about their stories and want
                    to keep them alive for future generations.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Beautiful gift card delivered by email</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Personalized message from you</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Easy setup — no tech skills needed</span>
                    </li>
                  </ul>
                  <Button size="lg" asChild>
                    <Link href="/login">
                      Gift a Memoir
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-64 bg-primary/10 rounded-lg transform rotate-3 absolute -top-2 -left-2" />
                    <div className="w-48 h-64 bg-primary/20 rounded-lg transform -rotate-3 relative">
                      <div className="absolute inset-4 border-2 border-dashed border-primary/30 rounded flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border-2 border-current rounded-full" />
            <div className="absolute bottom-10 right-10 w-48 h-48 border-2 border-current rounded-full" />
            <div className="absolute top-1/2 left-1/3 w-24 h-24 border-2 border-current rounded-full" />
          </div>
          <div className="container mx-auto text-center relative">
            <Feather className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Story Matters
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-6">
              Don&apos;t let your memories fade. Start capturing your life story
              today — it only takes a conversation.
            </p>
            <p className="text-sm opacity-70 mb-10">
              Free to start. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="#how-it-works">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-16 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Memoir</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Preserve your life stories through natural conversation.
                Your memoir, beautifully captured.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#how-it-works" className="hover:text-foreground transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Start Free
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Gift a Memoir
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="mailto:hello@memoir.bot" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Memoir. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with <Heart className="h-4 w-4 inline text-red-500" /> for families everywhere
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
