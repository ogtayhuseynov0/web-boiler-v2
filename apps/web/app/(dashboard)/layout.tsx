import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar, DashboardHeader } from "@/components/dashboard";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-hidden p-6 flex flex-col">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
