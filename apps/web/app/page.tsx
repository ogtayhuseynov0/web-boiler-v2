import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col px-4">
      <header className="border-b">
        <div className="flex h-16 items-center justify-between">
          <span className="text-xl font-bold">Boilerplate</span>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your Next.js + NestJS Boilerplate
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            A modern full-stack boilerplate with Next.js 15, NestJS 11, Supabase,
            Tailwind CSS, shadcn/ui, and more. Ready to build your next project.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="text-center text-sm text-muted-foreground">
          Built with Next.js, NestJS, and Supabase
        </div>
      </footer>
    </div>
  );
}
