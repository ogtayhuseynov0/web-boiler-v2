import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col relative">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/5 dark:bg-primary/3 blur-[100px]" />
      </div>

      <header className="border-b border-border px-4 py-4 dark:border-border/50">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <span className="text-xl font-bold">Boilerplate</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
