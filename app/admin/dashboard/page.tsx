import { createServerClient } from '@/lib/supabase/server';
import { Building2, Users, Phone, Clock } from 'lucide-react';
import type { Database } from '@/types/supabase';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

export default async function AdminDashboardPage() {
  const supabase = await createServerClient();

  // Fetch stats
  const [{ count: tenantCount }, { count: userCount }, { count: agentCount }] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('voice_agents').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      name: 'Total Tenants',
      value: tenantCount || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
    },
    {
      name: 'Total Users',
      value: userCount || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      name: 'Active Agents',
      value: agentCount || 0,
      icon: Phone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
    {
      name: 'System Status',
      value: 'Operational',
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-600/10',
    },
  ];

  // Fetch recent activity
  const { data: recentTenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentLeads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Pillow AI admin portal</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className={`inline-flex rounded-lg p-3 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{stat.name}</p>
              <p className="mt-1 text-3xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tenants */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Recent Tenants</h2>
          {recentTenants && recentTenants.length > 0 ? (
            <div className="space-y-4">
              {(recentTenants as Tenant[]).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tenants yet</p>
          )}
        </div>

        {/* Recent Leads */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Recent Leads</h2>
          {recentLeads && recentLeads.length > 0 ? (
            <div className="space-y-4">
              {(recentLeads as Lead[]).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No leads yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
