'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Settings, FileSpreadsheet, ChevronRight, Loader2 } from 'lucide-react';

interface SalesAgentConfigProps {
  onComplete: (config: SalesAgentConfig) => void;
  onBack: () => void;
}

export interface SalesAgentConfig {
  // Google Sheets
  googleSheetsConnected: boolean;
  inputSheetId?: string;
  inputSheetName?: string;
  columnMapping?: {
    businessName: string;
    phoneNumber: string;
    industry?: string;
    contactPerson?: string;
    description?: string;
  };

  // Schedule (Mandatory)
  schedule: {
    type: 'daily' | 'weekly' | 'custom';
    days: string[]; // ['monday', 'tuesday', etc.]
    startTime: string; // '09:00'
    endTime: string; // '17:00'
    timezone: string;
  };

  // Call Settings
  maxCallsPerDay: number;
  retryLogic: {
    noAnswer: {
      enabled: boolean;
      attempts: number;
      hoursApart: number;
    };
    voicemail: {
      enabled: boolean;
      retryAfterDays: number;
    };
    busy: {
      enabled: boolean;
      retryAfterHours: number;
    };
  };
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
];

export function SalesAgentConfig({ onComplete, onBack }: SalesAgentConfigProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Google Sheets State
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Schedule State
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'custom'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timezone, setTimezone] = useState('America/New_York');

  // Call Settings State
  const [maxCalls, setMaxCalls] = useState(100);
  const [retryNoAnswer, setRetryNoAnswer] = useState({ enabled: true, attempts: 2, hoursApart: 4 });
  const [retryVoicemail, setRetryVoicemail] = useState({ enabled: true, retryAfterDays: 3 });
  const [retryBusy, setRetryBusy] = useState({ enabled: true, retryAfterHours: 1 });

  // Check if Google Sheets is already connected on mount
  useEffect(() => {
    checkGoogleSheetsConnection();
  }, []);

  // Listen for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'google-sheets-connected') {
        checkGoogleSheetsConnection();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkGoogleSheetsConnection = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch('/api/google/sheets/list');
      const data = await response.json();

      if (data.connected) {
        setSheetsConnected(true);
        setSpreadsheets(data.spreadsheets || []);
      } else {
        setSheetsConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google Sheets connection:', error);
      setSheetsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleGoogleSheetsConnect = async () => {
    setLoadingSheets(true);
    try {
      // Get auth URL from API
      const response = await fetch('/api/google/sheets/auth');
      const data = await response.json();

      if (data.authUrl) {
        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          data.authUrl,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
    } finally {
      setLoadingSheets(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleComplete = () => {
    const config: SalesAgentConfig = {
      googleSheetsConnected: sheetsConnected,
      inputSheetId: selectedSheet,
      schedule: {
        type: scheduleType,
        days: selectedDays,
        startTime,
        endTime,
        timezone,
      },
      maxCallsPerDay: maxCalls,
      retryLogic: {
        noAnswer: retryNoAnswer,
        voicemail: retryVoicemail,
        busy: retryBusy,
      },
    };
    onComplete(config);
  };

  const canProceed = () => {
    if (currentStep === 1) return sheetsConnected && selectedSheet;
    if (currentStep === 2) return selectedDays.length > 0 && startTime && endTime;
    if (currentStep === 3) return maxCalls > 0;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step === currentStep
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 3 && (
                <div
                  className={`h-1 w-16 ${
                    step < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of 3
        </div>
      </div>

      {/* Step 1: Google Sheets Connection */}
      {currentStep === 1 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect Google Sheets</h3>
              <p className="text-sm text-muted-foreground">
                Import your prospect list from Google Sheets
              </p>
            </div>
          </div>

          {checkingConnection ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !sheetsConnected ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center">
                <FileSpreadsheet className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect your Google account to import prospect lists from Google Sheets
                </p>
                <Button
                  onClick={handleGoogleSheetsConnect}
                  className="gap-2"
                  disabled={loadingSheets}
                >
                  {loadingSheets ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Connect Google Sheets
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">Required Sheet Format:</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>Your Google Sheet should have these columns:</p>
                  <ul className="list-inside list-disc space-y-1 pl-4">
                    <li><strong>Business Name</strong> (Required)</li>
                    <li><strong>Phone Number</strong> (Required - format: +1-555-1234)</li>
                    <li>Industry (Optional)</li>
                    <li>Contact Person (Optional)</li>
                    <li>Description (Optional)</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    ✓
                  </div>
                  <span className="font-semibold">Google Sheets Connected</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Select Your Prospect List Sheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a sheet...</option>
                  {spreadsheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {spreadsheets.length === 0
                    ? 'No spreadsheets found. Create one in Google Sheets first.'
                    : 'The agent will call businesses from this sheet'}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-semibold">Output Call Log</h4>
                <p className="text-sm text-muted-foreground">
                  A new sheet will be automatically created: <strong>"Sales Agent - Call Log"</strong>
                  <br />
                  All call outcomes, notes, and follow-ups will be recorded there.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Schedule Configuration */}
      {currentStep === 2 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Set Calling Schedule</h3>
              <p className="text-sm text-muted-foreground">
                When should this agent make outbound calls?
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Schedule Type */}
            <div>
              <label className="mb-3 block text-sm font-medium">
                Schedule Type
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  onClick={() => {
                    setScheduleType('daily');
                    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
                  }}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    scheduleType === 'daily'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Daily</div>
                  <div className="text-xs text-muted-foreground">Every day</div>
                </button>
                <button
                  onClick={() => {
                    setScheduleType('weekly');
                    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
                  }}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    scheduleType === 'weekly'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Weekdays</div>
                  <div className="text-xs text-muted-foreground">Mon-Fri</div>
                </button>
                <button
                  onClick={() => setScheduleType('custom')}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    scheduleType === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Custom</div>
                  <div className="text-xs text-muted-foreground">Pick days</div>
                </button>
              </div>
            </div>

            {/* Days Selection (if custom) */}
            {scheduleType === 'custom' && (
              <div>
                <label className="mb-3 block text-sm font-medium">
                  Select Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`rounded-lg border px-4 py-2 font-medium transition-all ${
                        selectedDays.includes(day.value)
                          ? 'border-primary bg-primary text-white'
                          : 'hover:border-primary'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Range */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Time Zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">Schedule Preview</h4>
              <p className="text-sm text-muted-foreground">
                Calls will be made on{' '}
                <strong>
                  {scheduleType === 'daily'
                    ? 'Every day'
                    : scheduleType === 'weekly'
                    ? 'Monday - Friday'
                    : selectedDays.map((d) => d.slice(0, 3)).join(', ')}
                </strong>{' '}
                between <strong>{startTime}</strong> and <strong>{endTime}</strong> ({timezone.split('/')[1].replace('_', ' ')})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Call Settings & Retry Logic */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Max Calls Per Day */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Call Limits</h3>
                <p className="text-sm text-muted-foreground">
                  Control daily call volume
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Maximum Calls Per Day
              </label>
              <input
                type="number"
                value={maxCalls}
                onChange={(e) => setMaxCalls(parseInt(e.target.value) || 0)}
                min="1"
                max="1000"
                className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Agent will make up to {maxCalls} calls per day
              </p>
            </div>
          </div>

          {/* Retry Logic */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Retry Logic</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Configure how the agent handles unsuccessful call attempts
            </p>

            <div className="space-y-6">
              {/* No Answer */}
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">No Answer / Busy Signal</h4>
                    <p className="text-sm text-muted-foreground">
                      When call isn't answered
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={retryNoAnswer.enabled}
                      onChange={(e) =>
                        setRetryNoAnswer({ ...retryNoAnswer, enabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
                {retryNoAnswer.enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        value={retryNoAnswer.attempts}
                        onChange={(e) =>
                          setRetryNoAnswer({
                            ...retryNoAnswer,
                            attempts: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        max="5"
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">
                        Hours Apart
                      </label>
                      <input
                        type="number"
                        value={retryNoAnswer.hoursApart}
                        onChange={(e) =>
                          setRetryNoAnswer({
                            ...retryNoAnswer,
                            hoursApart: parseInt(e.target.value) || 0,
                          })
                        }
                        min="1"
                        max="48"
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Voicemail */}
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Voicemail</h4>
                    <p className="text-sm text-muted-foreground">
                      When voicemail is reached
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={retryVoicemail.enabled}
                      onChange={(e) =>
                        setRetryVoicemail({ ...retryVoicemail, enabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
                {retryVoicemail.enabled && (
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Retry After (Business Days)
                    </label>
                    <input
                      type="number"
                      value={retryVoicemail.retryAfterDays}
                      onChange={(e) =>
                        setRetryVoicemail({
                          ...retryVoicemail,
                          retryAfterDays: parseInt(e.target.value) || 0,
                        })
                      }
                      min="1"
                      max="30"
                      className="w-full rounded border px-3 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Busy */}
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Busy Signal</h4>
                    <p className="text-sm text-muted-foreground">
                      When line is busy
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={retryBusy.enabled}
                      onChange={(e) =>
                        setRetryBusy({ ...retryBusy, enabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
                {retryBusy.enabled && (
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Retry After (Hours)
                    </label>
                    <input
                      type="number"
                      value={retryBusy.retryAfterHours}
                      onChange={(e) =>
                        setRetryBusy({
                          ...retryBusy,
                          retryAfterHours: parseInt(e.target.value) || 0,
                        })
                      }
                      min="1"
                      max="24"
                      className="w-full rounded border px-3 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 1) {
              onBack();
            } else {
              setCurrentStep(currentStep - 1);
            }
          }}
        >
          Back
        </Button>

        <Button
          onClick={() => {
            if (currentStep < 3) {
              setCurrentStep(currentStep + 1);
            } else {
              handleComplete();
            }
          }}
          disabled={!canProceed()}
          className="gap-2"
        >
          {currentStep === 3 ? 'Create Agent' : 'Continue'}
          {currentStep < 3 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
