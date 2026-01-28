import { ClientSidebar } from '@/components/client/sidebar';
import { requireAuth } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  // Fetch tenant info
  let tenantName;
  if (user.tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', user.tenantId!)
      .single();
    // Type assertion after query
    const tenantData = tenant as any;
    tenantName = tenantData?.name;
  }

  return (
    <div className="flex h-screen">
      <ClientSidebar tenantName={tenantName} />
      <main className="flex-1 overflow-y-auto bg-muted/50">{children}</main>
    </div>
  );
}
