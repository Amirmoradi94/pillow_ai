import { AdminSidebar } from '@/components/admin/sidebar';
import { requireSuperAdmin } from '@/lib/supabase/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/50">{children}</main>
    </div>
  );
}
