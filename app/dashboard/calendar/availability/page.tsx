'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Save, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

interface TimeSlot {
  start: string;
  end: string;
}

interface Schedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

interface AvailabilityRule {
  id?: string;
  name: string;
  schedule: Schedule;
  timezone: string;
  slot_duration: number;
  buffer_before: number;
  buffer_after: number;
  min_booking_notice: number;
  max_booking_notice: number;
  is_default: boolean;
  active: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_SCHEDULE: Schedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
};

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [currentRule, setCurrentRule] = useState<AvailabilityRule>({
    name: 'Default Availability',
    schedule: DEFAULT_SCHEDULE,
    timezone: 'America/Los_Angeles',
    slot_duration: 30,
    buffer_before: 0,
    buffer_after: 0,
    min_booking_notice: 60,
    max_booking_notice: 43200,
    is_default: true,
    active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/calendar/availability-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
        if (data.rules && data.rules.length > 0) {
          setCurrentRule(data.rules[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const url = currentRule.id
        ? `/api/calendar/availability-rules/${currentRule.id}`
        : '/api/calendar/availability-rules';

      const response = await fetch(url, {
        method: currentRule.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRule),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability settings saved successfully!' });
        fetchRules();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (day: string) => {
    setCurrentRule({
      ...currentRule,
      schedule: {
        ...currentRule.schedule,
        [day]: [
          ...currentRule.schedule[day as keyof Schedule],
          { start: '09:00', end: '17:00' },
        ],
      },
    });
  };

  const removeTimeSlot = (day: string, index: number) => {
    setCurrentRule({
      ...currentRule,
      schedule: {
        ...currentRule.schedule,
        [day]: currentRule.schedule[day as keyof Schedule].filter((_, i) => i !== index),
      },
    });
  };

  const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...currentRule.schedule[day as keyof Schedule]];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setCurrentRule({
      ...currentRule,
      schedule: {
        ...currentRule.schedule,
        [day]: newSlots,
      },
    });
  };

  const copyToAllDays = (day: string) => {
    const slots = currentRule.schedule[day as keyof Schedule];
    const newSchedule: Schedule = {} as Schedule;
    DAYS.forEach((d) => {
      newSchedule[d as keyof Schedule] = JSON.parse(JSON.stringify(slots));
    });
    setCurrentRule({
      ...currentRule,
      schedule: newSchedule,
    });
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
          <h1 className="text-3xl font-bold">Availability Settings</h1>
          <p className="text-muted-foreground">Configure your working hours and booking constraints</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">General Settings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Rule Name</label>
                <input
                  type="text"
                  value={currentRule.name}
                  onChange={(e) => setCurrentRule({ ...currentRule, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Default Availability"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Timezone</label>
                <select
                  value={currentRule.timezone}
                  onChange={(e) => setCurrentRule({ ...currentRule, timezone: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Slot Duration (minutes)</label>
                <input
                  type="number"
                  value={currentRule.slot_duration}
                  onChange={(e) =>
                    setCurrentRule({ ...currentRule, slot_duration: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="15"
                  step="15"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Min Booking Notice (minutes)
                </label>
                <input
                  type="number"
                  value={currentRule.min_booking_notice}
                  onChange={(e) =>
                    setCurrentRule({
                      ...currentRule,
                      min_booking_notice: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Buffer Times */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Buffer Times</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Buffer Before (minutes)</label>
                <input
                  type="number"
                  value={currentRule.buffer_before}
                  onChange={(e) =>
                    setCurrentRule({ ...currentRule, buffer_before: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Buffer After (minutes)</label>
                <input
                  type="number"
                  value={currentRule.buffer_after}
                  onChange={(e) =>
                    setCurrentRule({ ...currentRule, buffer_after: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Weekly Schedule</h2>
            <div className="space-y-4">
              {DAYS.map((day) => (
                <div key={day} className="border-b pb-4 last:border-b-0">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium">{DAY_NAMES[day]}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(day)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToAllDays(day)}
                      >
                        Copy to All
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentRule.schedule[day as keyof Schedule].length === 0 ? (
                      <p className="text-sm text-muted-foreground">Unavailable</p>
                    ) : (
                      currentRule.schedule[day as keyof Schedule].map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                            className="rounded-lg border px-3 py-2"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                            className="rounded-lg border px-3 py-2"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(day, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Availability
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
