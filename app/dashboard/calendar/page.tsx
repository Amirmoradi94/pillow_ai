'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle, Clock, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CANADA_TIMEZONES = [
  { value: 'America/St_Johns', label: 'Newfoundland (America/St_Johns)' },
  { value: 'America/Halifax', label: 'Atlantic (America/Halifax)' },
  { value: 'America/Toronto', label: 'Eastern (America/Toronto)' },
  { value: 'America/Winnipeg', label: 'Central (America/Winnipeg)' },
  { value: 'America/Edmonton', label: 'Mountain (America/Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific (America/Vancouver)' },
  { value: 'America/Whitehorse', label: 'Yukon (America/Whitehorse)' },
];

interface CalendarProvider {
  id: string;
  provider: 'google' | 'outlook' | 'custom';
  provider_email: string;
  status: 'active' | 'inactive' | 'error' | 'expired';
  sync_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: 'tentative' | 'confirmed' | 'cancelled';
  booked_by?: string;
  attendees?: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  sync_source: 'internal' | 'google' | 'outlook';
}

interface CalendarEventDisplay {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface AgentCalendar {
  id: string;
  agent_id: string | null;
  agent_name: string;
  agent_status: string;
  calendar_name: string;
  availability_rule_id?: string | null;
  timezone: string;
  slot_duration: number;
  day_start: string;
  day_end: string;
  calendar_provider_id: string | null;
  owner_user_id: string | null;
  distribution_strategy: string;
  is_sales_outbound?: boolean;
  sales_schedule_mode?: 'pattern' | 'specific' | null;
  sales_specific_slots?: Array<{ date: string; time: string }>;
  provider: {
    id: string;
    type: string;
    email?: string | null;
    status: string;
  } | null;
}

export default function CalendarPage() {
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentCalendars, setAgentCalendars] = useState<AgentCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedAgentCalendar, setSelectedAgentCalendar] = useState<AgentCalendar | null>(null);
  const [activeAgentCalendarId, setActiveAgentCalendarId] = useState<string | null>(null);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState(false);
  const [savingAgentCalendar, setSavingAgentCalendar] = useState(false);
  const [newCalendarAgentId, setNewCalendarAgentId] = useState('');
  const [newCalendarProviderId, setNewCalendarProviderId] = useState('');
  const [newCalendarName, setNewCalendarName] = useState('Agent Calendar');
  const [newCalendarTimezone, setNewCalendarTimezone] = useState('America/Toronto');
  const [newCalendarStartTime, setNewCalendarStartTime] = useState('09:00');
  const [newCalendarEndTime, setNewCalendarEndTime] = useState('17:00');
  const [newCalendarSlotDuration, setNewCalendarSlotDuration] = useState(30);
  const isOutboundCalendarEdit = Boolean(selectedAgentCalendar?.is_sales_outbound);
  const activeCalendar = useMemo(
    () => agentCalendars.find((calendar) => calendar.id === activeAgentCalendarId) || null,
    [agentCalendars, activeAgentCalendarId]
  );
  const availabilityHref = useMemo(() => {
    const params = new URLSearchParams();
    if (activeCalendar?.availability_rule_id) {
      params.set('ruleId', activeCalendar.availability_rule_id);
    }
    if (activeCalendar?.calendar_name) {
      params.set('calendarName', activeCalendar.calendar_name);
    }
    const query = params.toString();
    return `/dashboard/calendar/availability${query ? `?${query}` : ''}`;
  }, [activeCalendar?.availability_rule_id, activeCalendar?.calendar_name]);

  const formatSpecificSlotLabel = (calendar: AgentCalendar) => {
    const slots = Array.isArray(calendar.sales_specific_slots) ? calendar.sales_specific_slots : [];
    const first = slots.find((slot) => slot?.date && slot?.time);
    if (!first) return 'Specific date/time schedule';
    return `${first.date} ${first.time}${slots.length > 1 ? ` (+${slots.length - 1} more)` : ''}`;
  };

  useEffect(() => {
    fetchProviders();
    fetchAgents();
    fetchAgentCalendars();

    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
      window.history.replaceState({}, '', '/dashboard/calendar');
    } else if (params.get('error')) {
      setMessage({ type: 'error', text: `Connection failed: ${params.get('error')}` });
      window.history.replaceState({}, '', '/dashboard/calendar');
    }
  }, []);

  useEffect(() => {
    if (agentCalendars.length === 0) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }
    fetchEvents(activeCalendar);
  }, [activeCalendar, agentCalendars.length]);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/calendar/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchEvents = async (calendar?: AgentCalendar | null) => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams();
      if (calendar?.agent_id) {
        params.set('agent_id', calendar.agent_id);
      } else if (calendar?.calendar_provider_id) {
        params.set('calendar_provider_id', calendar.calendar_provider_id);
      } else if (calendar?.owner_user_id) {
        params.set('user_id', calendar.owner_user_id);
      }
      const query = params.toString();
      const response = await fetch(`/api/calendar/events${query ? `?${query}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchAgentCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/agent-calendars');
      if (!response.ok) return;
      const data = await response.json();
      const calendars: AgentCalendar[] = data.calendars || [];
      setAgentCalendars(calendars);
      if (calendars.length === 0) {
        setActiveAgentCalendarId(null);
        return;
      }
      const hasCurrent = calendars.some((calendar) => calendar.id === activeAgentCalendarId);
      if (!hasCurrent) {
        setActiveAgentCalendarId(calendars[0].id);
      }
    } catch (error) {
      console.error('Error fetching agent calendars:', error);
    }
  };

  const openCreateAgentCalendarModal = () => {
    const defaultAgent = agents.find((agent) => agent.status === 'active') || agents[0];
    const defaultProvider = providers.find((provider) => provider.status === 'active') || providers[0];
    setNewCalendarAgentId(defaultAgent?.id || '');
    setNewCalendarProviderId(defaultProvider?.id || '');
    setNewCalendarName(defaultAgent ? `${defaultAgent.name} Calendar` : 'Agent Calendar');
    setNewCalendarTimezone('America/Toronto');
    setNewCalendarStartTime('09:00');
    setNewCalendarEndTime('17:00');
    setNewCalendarSlotDuration(30);
    setShowCreateCalendarModal(true);
  };

  const openEditAgentCalendarModal = (calendar: AgentCalendar) => {
    setSelectedAgentCalendar(calendar);
    setNewCalendarAgentId(calendar.agent_id || '');
    setNewCalendarProviderId(calendar.calendar_provider_id || calendar.provider?.id || '');
    setNewCalendarName(calendar.calendar_name || `${calendar.agent_name} Calendar`);
    setNewCalendarTimezone(calendar.timezone || 'America/Toronto');
    setNewCalendarStartTime(calendar.day_start || '09:00');
    setNewCalendarEndTime(calendar.day_end || '17:00');
    setNewCalendarSlotDuration(Number(calendar.slot_duration || 30));
  };

  const closeAgentCalendarModal = () => {
    setShowCreateCalendarModal(false);
    setSelectedAgentCalendar(null);
    setSavingAgentCalendar(false);
  };

  const handleCreateAgentCalendar = async () => {
    setSavingAgentCalendar(true);
    try {
      const response = await fetch('/api/calendar/agent-calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: newCalendarAgentId || undefined,
          calendar_provider_id: newCalendarProviderId,
          calendar_name: newCalendarName,
          timezone: newCalendarTimezone,
          day_start: newCalendarStartTime,
          day_end: newCalendarEndTime,
          slot_duration: newCalendarSlotDuration,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create calendar');
      }

      setMessage({ type: 'success', text: 'Agent calendar created successfully.' });
      closeAgentCalendarModal();
      await fetchAgentCalendars();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create calendar' });
    } finally {
      setSavingAgentCalendar(false);
    }
  };

  const handleUpdateAgentCalendar = async () => {
    if (!selectedAgentCalendar) {
      setMessage({ type: 'error', text: 'Please select a calendar.' });
      return;
    }

    const timezone = isOutboundCalendarEdit
      ? (selectedAgentCalendar?.timezone || 'America/Toronto')
      : newCalendarTimezone;
    const dayStart = isOutboundCalendarEdit
      ? (selectedAgentCalendar?.day_start || '09:00')
      : newCalendarStartTime;
    const dayEnd = isOutboundCalendarEdit
      ? (selectedAgentCalendar?.day_end || '17:00')
      : newCalendarEndTime;
    const slotDuration = isOutboundCalendarEdit
      ? Number(selectedAgentCalendar?.slot_duration || 30)
      : newCalendarSlotDuration;

    setSavingAgentCalendar(true);
    try {
      const response = await fetch(`/api/calendar/agent-calendars/${selectedAgentCalendar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: newCalendarAgentId || null,
          calendar_provider_id: newCalendarProviderId,
          calendar_name: newCalendarName,
          timezone,
          day_start: dayStart,
          day_end: dayEnd,
          slot_duration: slotDuration,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update calendar');
      }

      setMessage({ type: 'success', text: 'Agent calendar updated successfully.' });
      closeAgentCalendarModal();
      await fetchAgentCalendars();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update calendar' });
    } finally {
      setSavingAgentCalendar(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/calendar/google/connect');
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to initiate connection' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to Google Calendar' });
      setConnecting(false);
    }
  };

  const handleSync = async (providerId: string) => {
    setSyncing(providerId);
    setMessage(null);
    try {
      const response = await fetch(`/api/calendar/sync?providerId=${providerId}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Synced: ${data.eventsCreated} created, ${data.eventsUpdated} updated`,
        });
        fetchProviders();
        const activeCalendar = agentCalendars.find((calendar) => calendar.id === activeAgentCalendarId) || null;
        fetchEvents(activeCalendar);
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sync failed' });
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar? All synced events will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/google/disconnect/${providerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Calendar disconnected successfully' });
        fetchProviders();
        const activeCalendar = agentCalendars.find((calendar) => calendar.id === activeAgentCalendarId) || null;
        fetchEvents(activeCalendar);
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
    }
  };

  const handleDeleteAgentCalendar = async (calendar: AgentCalendar) => {
    if (!confirm(`Are you sure you want to delete "${calendar.calendar_name}"? This will remove all associated events and availability rules.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/agent-calendars/${calendar.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Agent calendar deleted successfully' });
        await fetchAgentCalendars();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete calendar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete calendar' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'expired':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Convert events for react-big-calendar
  const calendarEvents: CalendarEventDisplay[] = useMemo(() => {
    const timezone = activeCalendar?.timezone || 'America/Toronto';
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: toZonedTime(event.start_time, timezone),
      end: toZonedTime(event.end_time, timezone),
      resource: event,
    }));
  }, [events, activeCalendar?.timezone]);

  // Event style getter for color coding
  const eventStyleGetter = (event: CalendarEventDisplay) => {
    let backgroundColor = '#3174ad';

    if (event.resource.sync_source === 'google') {
      backgroundColor = '#4285f4'; // Google blue
    } else if (event.resource.booked_by === 'voice_agent') {
      backgroundColor = '#34a853'; // Green for voice agent bookings
    }

    if (event.resource.status === 'cancelled') {
      backgroundColor = '#ea4335'; // Red for cancelled
    } else if (event.resource.status === 'tentative') {
      backgroundColor = '#fbbc04'; // Yellow for tentative
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
        <div className="flex gap-2">
          {activeCalendar?.availability_rule_id ? (
            <Link href={availabilityHref}>
              <Button variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                {activeCalendar?.calendar_name
                  ? `Availability: ${activeCalendar.calendar_name}`
                  : 'Availability Settings'}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <Clock className="mr-2 h-4 w-4" />
              Availability Settings
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="mr-2 h-4 w-4" />
            Calendar Settings
          </Button>
          <Button
            onClick={() => {
              const activeCalendar = agentCalendars.find((calendar) => calendar.id === activeAgentCalendarId) || null;
              fetchEvents(activeCalendar);
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingEvents ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Agent Calendars</h2>
            <p className="text-sm text-muted-foreground">
              Select a calendar card to view that agent&apos;s real calendar.
            </p>
          </div>
          <Button
            onClick={openCreateAgentCalendarModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Calendar
          </Button>
        </div>

        {agentCalendars.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No calendars yet. Create one now, or create one while creating a new agent.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button
                onClick={openCreateAgentCalendarModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Calendar
              </Button>
              <Link href="/dashboard/agents/new">
                <Button variant="outline">Create Agent + Calendar</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agentCalendars.map((cal) => {
              const isActive = cal.id === activeAgentCalendarId;
              return (
                <div
                  key={cal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveAgentCalendarId(cal.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveAgentCalendarId(cal.id);
                    }
                  }}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    isActive ? 'border-primary bg-primary/5' : 'hover:border-primary hover:bg-muted/30'
                  }`}
                >
                  <div className="mb-1 font-medium">{cal.calendar_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {cal.agent_name} • {cal.timezone}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cal.is_sales_outbound
                      ? cal.sales_schedule_mode === 'specific'
                        ? formatSpecificSlotLabel(cal)
                        : `${cal.day_start}-${cal.day_end} • ${cal.slot_duration}m • Pattern`
                      : `${cal.day_start}-${cal.day_end} • ${cal.slot_duration}m`}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {cal.provider
                        ? `${cal.provider.type.toUpperCase()}${cal.provider.email ? ` · ${cal.provider.email}` : ''}`
                        : 'Pillow Internal Calendar'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditAgentCalendarModal(cal);
                        }}
                        className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgentCalendar(cal);
                        }}
                        className="rounded-md border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete calendar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Settings Panel */}
      {showSettings && (
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Calendar Integrations</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect external calendars to sync appointments automatically
            </p>
            <Button onClick={handleConnectGoogle} disabled={connecting}>
              {connecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Connect Google Calendar
            </Button>
          </div>

          {providers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Connected Calendars</h3>
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(provider.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{provider.provider_email}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                            provider.status
                          )}`}
                        >
                          {provider.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last synced: {formatDate(provider.last_synced_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(provider.id)}
                      disabled={syncing === provider.id}
                    >
                      {syncing === provider.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(provider.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Main Calendar View */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="mb-2 text-sm font-medium">
              {agentCalendars.length === 0
                ? 'No agent calendar selected'
                : `Showing: ${agentCalendars.find((calendar) => calendar.id === activeAgentCalendarId)?.calendar_name || 'Agent Calendar'}`}
            </div>
            <div className="flex gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: '#4285f4' }}></div>
              <span className="text-muted-foreground">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: '#34a853' }}></div>
              <span className="text-muted-foreground">Voice Agent Booking</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: '#3174ad' }}></div>
              <span className="text-muted-foreground">Internal</span>
            </div>
            </div>
          </div>
        </div>

        {agentCalendars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Create your first agent calendar to start viewing schedules.</p>
            <Button
              className="mt-4"
              onClick={openCreateAgentCalendarModal}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Calendar
            </Button>
          </div>
        ) : loadingEvents ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        ) : (
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              views={['day', 'week', 'month']}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              step={15}
              timeslots={1}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              style={{ height: '100%' }}
            />
          </div>
        )}
      </div>

      {(showCreateCalendarModal || selectedAgentCalendar) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedAgentCalendar ? 'Edit Agent Calendar' : 'Create Agent Calendar'}
              </h2>
              <button onClick={closeAgentCalendarModal} className="rounded-lg p-2 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Agent (optional)</label>
                <select
                  value={newCalendarAgentId}
                  onChange={(e) => {
                    setNewCalendarAgentId(e.target.value);
                    const selected = agents.find((agent) => agent.id === e.target.value);
                    if (selected && !selectedAgentCalendar) {
                      setNewCalendarName(`${selected.name} Calendar`);
                    }
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Unassigned (assign later)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Calendar Name</label>
                <input
                  type="text"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Downtown Branch Calendar"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Calendar Provider</label>
                <select
                  value={newCalendarProviderId}
                  onChange={(e) => setNewCalendarProviderId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Pillow Internal Calendar (built-in)</option>
                  {providers
                    .filter((provider) => provider.status === 'active')
                    .map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.provider.toUpperCase()} {provider.provider_email ? `- ${provider.provider_email}` : ''}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Uses Pillow Internal Calendar by default. You can switch to Google/Outlook later.
                </p>
              </div>

              {!isOutboundCalendarEdit && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Timezone</label>
                    <select
                      value={newCalendarTimezone}
                      onChange={(e) => setNewCalendarTimezone(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {CANADA_TIMEZONES.map((timezone) => (
                        <option key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Slot Duration (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={newCalendarSlotDuration}
                      onChange={(e) => setNewCalendarSlotDuration(parseInt(e.target.value || '30', 10))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Open Time</label>
                    <input
                      type="time"
                      value={newCalendarStartTime}
                      onChange={(e) => setNewCalendarStartTime(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Close Time</label>
                    <input
                      type="time"
                      value={newCalendarEndTime}
                      onChange={(e) => setNewCalendarEndTime(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {isOutboundCalendarEdit && (
              <p className="mt-4 text-xs text-muted-foreground">
                Timezone and call timing are controlled by the outbound sales schedule configured during agent setup.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeAgentCalendarModal}>
                Cancel
              </Button>
              <Button
                onClick={selectedAgentCalendar ? handleUpdateAgentCalendar : handleCreateAgentCalendar}
                disabled={savingAgentCalendar}
              >
                {savingAgentCalendar
                  ? (selectedAgentCalendar ? 'Saving...' : 'Creating...')
                  : (selectedAgentCalendar ? 'Save Changes' : 'Create Calendar')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Time</label>
                <p className="text-sm">
                  {new Date(selectedEvent.start_time).toLocaleString()} -{' '}
                  {new Date(selectedEvent.end_time).toLocaleTimeString()}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-sm">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      selectedEvent.status === 'confirmed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : selectedEvent.status === 'tentative'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {selectedEvent.status}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Source</label>
                <p className="text-sm capitalize">{selectedEvent.sync_source}</p>
              </div>

              {selectedEvent.booked_by && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Booked By</label>
                  <p className="text-sm capitalize">{selectedEvent.booked_by.replace('_', ' ')}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Attendees</label>
                  <div className="mt-2 space-y-2">
                    {selectedEvent.attendees.map((attendee, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <p className="font-medium">{attendee.name}</p>
                        {attendee.email && (
                          <p className="text-sm text-muted-foreground">{attendee.email}</p>
                        )}
                        {attendee.phone && (
                          <p className="text-sm text-muted-foreground">{attendee.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedEvent(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
