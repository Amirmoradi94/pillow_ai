import { createServerClient } from '@/lib/supabase/server';
import { Mic, PhoneCall, Clock, TrendingUp, Sparkles } from 'lucide-react';

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
      gradient: 'gradient-primary',
    },
    {
      name: 'Total Calls',
      value: callCount || 0,
      icon: PhoneCall,
      gradient: 'gradient-secondary',
    },
    {
      name: 'Avg. Call Duration',
      value: avgDurationText,
      icon: Clock,
      gradient: 'gradient-primary',
    },
    {
      name: 'Response Rate',
      value: responseRateText,
      icon: TrendingUp,
      gradient: 'gradient-secondary',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Decorative orbs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 space-y-8 p-8">
        {/* Header with premium styling */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-4 shadow-soft">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Dashboard
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
            Welcome back!
          </h1>
          <p className="text-lg text-muted-foreground">Here's your overview</p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.name}
              className="group relative overflow-hidden"
            >
              <div className="h-full p-6 rounded-2xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
                {/* Animated background */}
                <div className={`absolute inset-0 ${
                  index % 2 === 0 ? 'bg-gradient-to-br from-primary/5' : 'bg-gradient-to-br from-secondary/5'
                } to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`absolute -right-12 -bottom-12 w-32 h-32 ${
                  index % 2 === 0 ? 'bg-primary/10' : 'bg-secondary/10'
                } rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500`} />

                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${stat.gradient} shadow-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{stat.name}</p>
                  <p className="text-3xl font-bold text-gradient">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Recent Calls Section */}
        <div className="group relative overflow-hidden">
          <div className="p-8 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-500" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg gradient-primary shadow-glow flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Recent Calls</h2>
              </div>

              {recentCalls && recentCalls.length > 0 ? (
                <div className="space-y-4">
                  {recentCalls.map((call: any) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 rounded-xl glass hover:shadow-card transition-all duration-300 group/item"
                    >
                      <div>
                        <p className="font-semibold text-card-foreground">{call.phone_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(call.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              call.status === 'completed'
                                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-red-500/20 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {call.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl gradient-secondary shadow-glow-secondary flex items-center justify-center mx-auto mb-4">
                    <PhoneCall className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="text-lg text-muted-foreground">No calls yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your call history will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
