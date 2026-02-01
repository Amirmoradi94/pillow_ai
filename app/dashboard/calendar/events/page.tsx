'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Clock, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  status: 'tentative' | 'confirmed' | 'cancelled';
  booked_by: 'voice_agent' | 'user' | 'external';
  attendees: Array<{
    name: string;
    email?: string;
    phone?: string;
    status?: string;
  }>;
  sync_source: 'internal' | 'google' | 'outlook';
}

export default function CalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      let url = '/api/calendar/events?';

      if (filter === 'upcoming') {
        url += `start_date=${now}`;
      } else if (filter === 'past') {
        url += `end_date=${now}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'tentative':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'google':
        return <span className="text-xs text-blue-600">📅 Google</span>;
      case 'internal':
        return <span className="text-xs text-purple-600">🤖 Voice Agent</span>;
      default:
        return <span className="text-xs text-gray-600">📋 {source}</span>;
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/calendar">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Calendar Events</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Events
        </Button>
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'outline'}
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No events found</h3>
          <p className="mt-2 text-muted-foreground">
            {filter === 'upcoming'
              ? 'You have no upcoming appointments'
              : 'No events match your filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border bg-card p-6 transition-all hover:shadow-md"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                        event.status
                      )}`}
                    >
                      {event.status}
                    </span>
                    {getSourceBadge(event.sync_source)}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(event.start_time)}
                      {' - '}
                      {formatTime(event.end_time)}
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.attendees.length} attendee
                        {event.attendees.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {event.attendees && event.attendees.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.attendees.map((attendee, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                        >
                          <span>{attendee.name}</span>
                          {attendee.phone && (
                            <span className="text-muted-foreground">
                              <Phone className="inline h-3 w-3" /> {attendee.phone}
                            </span>
                          )}
                          {attendee.email && (
                            <span className="text-muted-foreground">
                              <Mail className="inline h-3 w-3" /> {attendee.email}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Details Modal (Simple Version) */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                      selectedEvent.status
                    )}`}
                  >
                    {selectedEvent.status}
                  </span>
                  {getSourceBadge(selectedEvent.sync_source)}
                </div>
              </div>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Time</h3>
                <p className="text-sm">
                  {formatDate(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <h3 className="mb-2 font-semibold">Location</h3>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <h3 className="mb-2 font-semibold">Description</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Attendees</h3>
                  <div className="space-y-2">
                    {selectedEvent.attendees.map((attendee, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <p className="font-medium">{attendee.name}</p>
                        {attendee.email && (
                          <p className="text-sm text-muted-foreground">
                            <Mail className="inline h-3 w-3" /> {attendee.email}
                          </p>
                        )}
                        {attendee.phone && (
                          <p className="text-sm text-muted-foreground">
                            <Phone className="inline h-3 w-3" /> {attendee.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
