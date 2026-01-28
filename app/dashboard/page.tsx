import { createServerClient } from '@/lib/supabase/server';
import { Mic, PhoneCall, Clock, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const user = await (await import('@/lib/supabase/auth')).requireAuth();
  const supabase = await createServerClient();

  // Fetch stats for the tenant
  const [{ count: agentCount }, { count: callCount }, { data: allCalls }] = await Promise.all([
    supabase
      .from('voice_agents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId),
    supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId),
    supabase
      .from('calls')
      .select('duration, status')
      .eq('tenant_id', user.tenantId),
  ]);

  // Calculate average call duration
  const totalDuration = allCalls?.reduce((sum: number, call: any) => sum + (call.duration || 0), 0) || 0;
  const avgDuration = allCalls && allCalls.length > 0 ? Math.floor(totalDuration / allCalls.length) : 0;
  const avgMinutes = Math.floor(avgDuration / 60);
  const avgSeconds = avgDuration % 60;
  const avgDurationText = avgDuration > 0 ? `${avgMinutes}m ${avgSeconds}s` : '0s';

  // Calculate response rate (completed calls / total calls)
  const completedCalls = allCalls?.filter((call: any) => call.status === 'completed').length || 0;
  const totalCallsCount = allCalls?.length || 0;
  const responseRate = totalCallsCount > 0 ? ((completedCalls / totalCallsCount) * 100).toFixed(1) : '0';
  const responseRateText = totalCallsCount > 0 ? `${responseRate}%` : 'N/A';

  // Fetch recent calls
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = [
    {
      name: 'Active Agents',
      value: agentCount || 0,
      icon: Mic,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
    },
    {
      name: 'Total Calls',
      value: callCount || 0,
      icon: PhoneCall,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      name: 'Avg. Call Duration',
      value: avgDurationText,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
    {
      name: 'Response Rate',
      value: responseRateText,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-600/10',
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview</p>
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

      {/* Recent Calls */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Recent Calls</h2>
        {recentCalls && recentCalls.length > 0 ? (
          <div className="space-y-4">
            {recentCalls.map((call: any) => (
              <div
                key={call.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{call.phone_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(call.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        call.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {call.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor(call.duration / 60)}m {call.duration % 60}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No calls yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
