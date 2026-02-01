'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle, Clock, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
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

export default function CalendarPage() {
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchProviders();
    fetchEvents();

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

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch('/api/calendar/events');
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
        fetchEvents();
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
        fetchEvents();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
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
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      resource: event,
    }));
  }, [events]);

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
          <Link href="/dashboard/calendar/availability">
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Availability Settings
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="mr-2 h-4 w-4" />
            Calendar Settings
          </Button>
          <Button onClick={fetchEvents}>
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

        {loadingEvents ? (
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
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              style={{ height: '100%' }}
            />
          </div>
        )}
      </div>

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
