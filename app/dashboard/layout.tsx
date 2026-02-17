import { ClientSidebar } from '@/components/client/sidebar';
import { requireAuth } from '@/lib/supabase/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex h-screen">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/50">{children}</main>
    </div>
  );
}
