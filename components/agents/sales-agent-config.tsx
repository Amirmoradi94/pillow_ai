'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Settings, FileSpreadsheet, ChevronRight, Loader2 } from 'lucide-react';

interface SalesAgentConfigProps {
  onComplete: (config: SalesAgentConfig) => void;
  onBack: () => void;
}

export interface SalesAgentConfig {
  dataSource: 'google_sheets' | 'csv_upload';
  // Google Sheets
  googleSheetsConnected: boolean;
  inputSheetId?: string;
  inputSheetName?: string;
  csvFileId?: string;
  csvFileName?: string;
  csvRowCount?: number;
  columnMapping?: {
    businessName: string;
    phoneNumber: string;
    industry?: string;
    contactPerson?: string;
    description?: string;
  };

  // Schedule (Mandatory)
  schedule: {
    type: 'weekly' | 'custom';
    days: string[]; // ['monday', 'tuesday', etc.]
    startTime: string; // '09:00'
    endTime: string; // '17:00'
    timezone: string;
    callIntervalMinutes: number;
    customStartDate?: string; // '2026-02-17'
    recurrence?: {
      enabled: boolean;
      interval: number; // every N units
      unit: 'day' | 'week' | 'month';
    };
    customMode?: 'pattern' | 'specific';
    specificDateTimes?: Array<{
      date: string; // '2026-02-17'
      time: string; // '10:00'
    }>;
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
  { value: 'America/St_Johns', label: 'Newfoundland (America/St_Johns)' },
  { value: 'America/Halifax', label: 'Atlantic (America/Halifax)' },
  { value: 'America/Toronto', label: 'Eastern (America/Toronto)' },
  { value: 'America/Winnipeg', label: 'Central (America/Winnipeg)' },
  { value: 'America/Edmonton', label: 'Mountain (America/Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific (America/Vancouver)' },
  { value: 'America/Whitehorse', label: 'Yukon (America/Whitehorse)' },
];
const QUARTER_HOUR_OPTIONS = Array.from({ length: 24 * 4 }, (_, idx) => {
  const minutes = idx * 15;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
});

export function SalesAgentConfig({ onComplete, onBack }: SalesAgentConfigProps) {
  const TOTAL_STEPS = 4;
  const LOCAL_FORM_STEPS = 3;
  const [currentStep, setCurrentStep] = useState(1);

  // Google Sheets State
  const [dataSource, setDataSource] = useState<'google_sheets' | 'csv_upload'>('google_sheets');
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [sheetTabs, setSheetTabs] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingSheetInfo, setLoadingSheetInfo] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingLeadCount, setLoadingLeadCount] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [googleSheetLeadCount, setGoogleSheetLeadCount] = useState<number | null>(null);

  // CSV Upload State
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [uploadedCsv, setUploadedCsv] = useState<{
    id: string;
    name: string;
    rowCount: number;
    headers: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Schedule State
  const [scheduleType, setScheduleType] = useState<'weekly' | 'custom'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timezone, setTimezone] = useState('America/Toronto');
  const [callIntervalMinutes, setCallIntervalMinutes] = useState(15);
  const [customStartDate, setCustomStartDate] = useState('');
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(true);
  const [recurrenceInterval, setRecurrenceInterval] = useState(2);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'day' | 'week' | 'month'>('week');
  const [customMode, setCustomMode] = useState<'pattern' | 'specific'>('pattern');
  const [specificDateTimes, setSpecificDateTimes] = useState<Array<{ date: string; time: string }>>([]);

  // Call Settings State
  const [maxCalls, setMaxCalls] = useState(100);
  const [maxCallsManuallyEdited, setMaxCallsManuallyEdited] = useState(false);
  const [retryNoAnswer, setRetryNoAnswer] = useState({ enabled: true, attempts: 2, hoursApart: 4 });
  const [retryVoicemail, setRetryVoicemail] = useState({ enabled: true, retryAfterDays: 3 });
  const [retryBusy, setRetryBusy] = useState({ enabled: true, retryAfterHours: 1 });

  // Check if Google Sheets is already connected on mount
  useEffect(() => {
    if (dataSource === 'google_sheets') {
      checkGoogleSheetsConnection();
    } else {
      setCheckingConnection(false);
    }
  }, [dataSource]);

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

  useEffect(() => {
    if (dataSource === 'csv_upload') {
      setSelectedSheet('');
      setSelectedSheetName('');
      setSheetTabs([]);
      setGoogleSheetLeadCount(null);
    } else {
      setUploadedCsv(null);
      setCsvError('');
    }
  }, [dataSource]);

  const toMinutes = (value: string): number => {
    const [h, m] = value.split(':').map((v) => parseInt(v, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };

  const isQuarterHourTime = (value: string): boolean => {
    const minutes = toMinutes(value);
    return minutes >= 0 && minutes % 15 === 0;
  };

  const leadCount = dataSource === 'csv_upload'
    ? (uploadedCsv?.rowCount || 0)
    : (googleSheetLeadCount || 0);

  const dailyWindowMinutes = Math.max(0, toMinutes(endTime) - toMinutes(startTime));
  const callsByWindow = callIntervalMinutes > 0
    ? Math.floor(dailyWindowMinutes / callIntervalMinutes)
    : 0;
  const specificSlotsByDate = specificDateTimes.reduce<Record<string, number>>((acc, slot) => {
    if (!slot.date || !slot.time) return acc;
    acc[slot.date] = (acc[slot.date] || 0) + 1;
    return acc;
  }, {});
  const callsBySpecific = Object.values(specificSlotsByDate).reduce((max, count) => Math.max(max, count), 0);
  const callsBySchedule = scheduleType === 'custom' && customMode === 'specific' ? callsBySpecific : callsByWindow;
  const autoMaxCalls = Math.max(1, Math.min(leadCount || 1, callsBySchedule || 1));

  useEffect(() => {
    if (!maxCallsManuallyEdited) {
      setMaxCalls(autoMaxCalls);
    }
  }, [autoMaxCalls, maxCallsManuallyEdited]);

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

  const handleCsvUpload = async (file: File) => {
    setUploadingCsv(true);
    setCsvError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/prospects/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.missing?.length) {
          setCsvError(`Missing required headers: ${data.missing.join(', ')}`);
        } else if (data.missingRows?.length || data.invalidPhoneRows?.length) {
          const missingRows = data.missingRows?.length
            ? `Missing required fields in rows: ${data.missingRows.join(', ')}`
            : '';
          const invalidPhones = data.invalidPhoneRows?.length
            ? `Invalid phone format in rows: ${data.invalidPhoneRows.join(', ')} (use +1-555-555-1234)`
            : '';
          setCsvError([missingRows, invalidPhones].filter(Boolean).join(' | '));
        } else {
          setCsvError(data.error || 'Upload failed');
        }
        setUploadedCsv(null);
        return;
      }

      setUploadedCsv({
        id: data.id,
        name: data.name,
        rowCount: data.rowCount,
        headers: data.headers,
      });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setCsvError('Upload failed. Please try again.');
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleCsvDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleCsvUpload(file);
  };

  const loadSheetTabs = async (spreadsheetId: string) => {
    setLoadingSheetInfo(true);
    try {
      const response = await fetch(`/api/google/sheets/${spreadsheetId}/info`);
      const data = await response.json();
      if (response.ok) {
        const tabs = (data.sheets || []).map((sheet: any) => ({
          id: sheet.sheetId,
          title: sheet.title,
        }));
        setSheetTabs(tabs);
        setSelectedSheetName(tabs[0]?.title || '');
      }
    } catch (error) {
      console.error('Error fetching sheet tabs:', error);
    } finally {
      setLoadingSheetInfo(false);
    }
  };

  const loadSheetLeadCount = async (spreadsheetId: string, sheetName: string) => {
    if (!spreadsheetId || !sheetName) {
      setGoogleSheetLeadCount(null);
      return;
    }

    setLoadingLeadCount(true);
    try {
      const escaped = sheetName.replace(/'/g, "''");
      const range = encodeURIComponent(`'${escaped}'!A:ZZ`);
      const response = await fetch(`/api/google/sheets/${spreadsheetId}/read?range=${range}`);
      const data = await response.json();

      if (!response.ok) {
        setGoogleSheetLeadCount(null);
        return;
      }

      const values = Array.isArray(data.values) ? data.values : [];
      const rows = Math.max(0, values.length - 1); // exclude header row
      setGoogleSheetLeadCount(rows);
    } catch (error) {
      console.error('Error loading sheet lead count:', error);
      setGoogleSheetLeadCount(null);
    } finally {
      setLoadingLeadCount(false);
    }
  };

  useEffect(() => {
    if (dataSource === 'google_sheets' && selectedSheet && selectedSheetName) {
      loadSheetLeadCount(selectedSheet, selectedSheetName);
    }
  }, [dataSource, selectedSheet, selectedSheetName]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleComplete = () => {
    const config: SalesAgentConfig = {
      dataSource,
      googleSheetsConnected: sheetsConnected,
      inputSheetId: selectedSheet,
      inputSheetName: selectedSheetName,
      csvFileId: dataSource === 'csv_upload' ? uploadedCsv?.id : undefined,
      csvFileName: dataSource === 'csv_upload' ? uploadedCsv?.name : undefined,
      csvRowCount: dataSource === 'csv_upload' ? uploadedCsv?.rowCount : undefined,
      schedule: {
        type: scheduleType,
        days: selectedDays,
        startTime,
        endTime,
        timezone,
        callIntervalMinutes,
        customStartDate: scheduleType === 'custom' ? customStartDate : undefined,
        recurrence: scheduleType === 'custom'
          ? {
              enabled: recurrenceEnabled,
              interval: Math.max(1, recurrenceInterval || 1),
              unit: recurrenceUnit,
            }
          : undefined,
        customMode: scheduleType === 'custom' ? customMode : undefined,
        specificDateTimes:
          scheduleType === 'custom' && customMode === 'specific'
            ? specificDateTimes.filter((slot) => slot.date && slot.time)
            : undefined,
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
    if (currentStep === 1) {
      if (dataSource === 'google_sheets') return sheetsConnected && selectedSheet && selectedSheetName;
      return !!uploadedCsv;
    }
    if (currentStep === 2) {
      if (scheduleType !== 'custom') {
        return selectedDays.length > 0 && startTime && endTime && callIntervalMinutes > 0;
      }

      if (customMode === 'specific') {
        return specificDateTimes.some((slot) =>
          Boolean(slot.date && slot.time && isQuarterHourTime(slot.time))
        );
      }

      const hasPatternSchedule = selectedDays.length > 0 && startTime && endTime && callIntervalMinutes > 0;
      if (!hasPatternSchedule) return false;
      if (!customStartDate) return false;
      return !recurrenceEnabled || recurrenceInterval > 0;
    }
    if (currentStep === 3) return maxCalls > 0;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, idx) => idx + 1).map((step) => (
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
              {step < TOTAL_STEPS && (
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
          Step {currentStep} of {TOTAL_STEPS}
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
              <h3 className="text-lg font-semibold">Prospect List Source</h3>
              <p className="text-sm text-muted-foreground">
                Choose where the agent should load prospects from
              </p>
            </div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <button
              onClick={() => setDataSource('google_sheets')}
              className={`rounded-lg border p-4 text-left transition-all ${
                dataSource === 'google_sheets'
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Google Sheets</div>
              <div className="text-xs text-muted-foreground">Use your Google account</div>
            </button>
            <button
              onClick={() => setDataSource('csv_upload')}
              className={`rounded-lg border p-4 text-left transition-all ${
                dataSource === 'csv_upload'
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Upload CSV</div>
              <div className="text-xs text-muted-foreground">Upload a leads file</div>
            </button>
          </div>

          {dataSource === 'google_sheets' && checkingConnection ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dataSource === 'google_sheets' && !sheetsConnected ? (
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
                  <li><strong>business_name</strong> (Required)</li>
                  <li><strong>business_phone</strong> (Required - format: +1-555-1234)</li>
                  <li><strong>business_industry</strong> (Required)</li>
                  <li><strong>business_contact_person</strong> (Required)</li>
                  <li><strong>business_description</strong> (Required)</li>
                </ul>
              </div>
            </div>
            </div>
          ) : dataSource === 'google_sheets' ? (
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
                  onChange={(e) => {
                    const sheetId = e.target.value;
                    setSelectedSheet(sheetId);
                    setSelectedSheetName('');
                    setSheetTabs([]);
                    setGoogleSheetLeadCount(null);
                    if (sheetId) {
                      loadSheetTabs(sheetId);
                    }
                  }}
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

              {selectedSheet && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Select Worksheet Tab
                  </label>
                  <select
                    value={selectedSheetName}
                    onChange={(e) => setSelectedSheetName(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose a tab...</option>
                    {sheetTabs.map((sheet) => (
                      <option key={sheet.id} value={sheet.title}>
                        {sheet.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loadingSheetInfo
                      ? 'Loading sheet tabs...'
                      : sheetTabs.length === 0
                      ? 'No tabs found. Ensure your spreadsheet has at least one tab.'
                      : 'Select the tab with your prospect list.'}
                  </p>
                </div>
              )}

              {(selectedSheet && selectedSheetName) && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  {loadingLeadCount ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Counting leads from selected sheet...
                    </div>
                  ) : (
                    <div>
                      Detected leads: <strong>{googleSheetLeadCount ?? 0}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-semibold">Output Call Log</h4>
                <p className="text-sm text-muted-foreground">
                  A new sheet will be automatically created: <strong>"Sales Agent - Call Log"</strong>
                  <br />
                  All call outcomes, notes, and follow-ups will be recorded there.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Upload CSV
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                  }}
                  onDrop={handleCsvDrop}
                  onClick={() => document.getElementById('csv-upload-input')?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
                    isDragOver ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                >
                  <div className="font-medium">Drag & drop your CSV here</div>
                  <div className="text-xs text-muted-foreground">or click to upload</div>
                </div>
                <input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                  className="hidden"
                />
                {uploadingCsv && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
                {csvError && (
                  <div className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                    {csvError}
                  </div>
                )}
                {uploadedCsv && (
                  <div className="mt-2 rounded-lg border p-2 text-sm">
                    Uploaded: <strong>{uploadedCsv.name}</strong> ({uploadedCsv.rowCount} leads)
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">CSV Format:</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>Required columns:</p>
                  <p><strong>business_name</strong>, <strong>business_phone</strong></p>
                  <p>Also required: business_industry, business_contact_person, business_description</p>
                </div>
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
              <div className="grid gap-3 md:grid-cols-2">
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
                  <div className="text-xs text-muted-foreground">Date + repeat rule</div>
                </button>
              </div>
            </div>

            {/* Days Selection (if custom) */}
            {scheduleType === 'custom' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Custom Mode
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCustomMode('pattern')}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        customMode === 'pattern' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">Pattern</div>
                      <div className="text-xs text-muted-foreground">Days + start/end + repeat</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMode('specific')}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        customMode === 'specific' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">Specific Date & Time</div>
                      <div className="text-xs text-muted-foreground">One-off exact slots</div>
                    </button>
                  </div>
                </div>

                {customMode === 'pattern' ? (
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
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Specific Call Slots</label>
                    {specificDateTimes.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add one or more exact date/time slots.</p>
                    )}
                    {specificDateTimes.map((slot, index) => (
                      <div key={`${index}-${slot.date}-${slot.time}`} className="grid gap-2 md:grid-cols-3">
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(e) => {
                            const next = [...specificDateTimes];
                            next[index] = { ...next[index], date: e.target.value };
                            setSpecificDateTimes(next);
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <select
                          value={slot.time}
                          onChange={(e) => {
                            const next = [...specificDateTimes];
                            next[index] = { ...next[index], time: e.target.value };
                            setSpecificDateTimes(next);
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select time...</option>
                          {QUARTER_HOUR_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSpecificDateTimes(specificDateTimes.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSpecificDateTimes([...specificDateTimes, { date: '', time: '' }])}
                    >
                      Add Date & Time
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Time Range */}
            {(scheduleType !== 'custom' || customMode === 'pattern') && (
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
            )}

            {(scheduleType !== 'custom' || customMode === 'pattern') && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Gap Between Calls (Minutes)
              </label>
              <input
                type="number"
                value={callIntervalMinutes}
                onChange={(e) => setCallIntervalMinutes(parseInt(e.target.value, 10) || 0)}
                min="1"
                max="180"
                className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Example: 15 means at most one new outbound call every 15 minutes.
              </p>
            </div>
            )}

            {scheduleType === 'custom' && customMode === 'pattern' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    First Call Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Repeat This Schedule</h4>
                    <p className="text-xs text-muted-foreground">
                      Turn off for one-time scheduling.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={recurrenceEnabled}
                      onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

                {recurrenceEnabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Every</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Unit</label>
                      <select
                        value={recurrenceUnit}
                        onChange={(e) => setRecurrenceUnit(e.target.value as 'day' | 'week' | 'month')}
                        className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="day">Day(s)</option>
                        <option value="week">Week(s)</option>
                        <option value="month">Month(s)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              {scheduleType === 'custom' && customMode === 'specific' ? (
                <p className="text-sm text-muted-foreground">
                  Calls will run on exact date/time slots ({timezone.split('/')[1].replace('_', ' ')}):
                  {' '}
                  <strong>
                    {specificDateTimes.filter((slot) => slot.date && slot.time).length}
                  </strong>
                  {' '}slot(s) configured.
                </p>
              ) : (
              <p className="text-sm text-muted-foreground">
                Calls will be made on{' '}
                <strong>
                  {scheduleType === 'weekly'
                    ? 'Monday - Friday'
                    : selectedDays.map((d) => d.slice(0, 3)).join(', ')}
                </strong>{' '}
                between <strong>{startTime}</strong> and <strong>{endTime}</strong> ({timezone.split('/')[1].replace('_', ' ')})
                {scheduleType === 'custom' && customStartDate ? (
                  <>
                    . First run date: <strong>{customStartDate}</strong>
                    {recurrenceEnabled
                      ? <>. Repeats every <strong>{Math.max(1, recurrenceInterval)} {recurrenceUnit}{Math.max(1, recurrenceInterval) > 1 ? 's' : ''}</strong></>
                      : <>. <strong>One-time custom schedule</strong></>}
                  </>
                ) : null}
                . Up to one new call every <strong>{callIntervalMinutes} minutes</strong>.
              </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Auto call capacity per day: <strong>{callsBySchedule}</strong>{' '}
                {scheduleType === 'custom' && customMode === 'specific'
                  ? 'based on configured specific slots.'
                  : 'based on time window and gap.'}
                Current leads detected: <strong>{leadCount}</strong>.
                Recommended max calls/day: <strong>{autoMaxCalls}</strong>.
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
                onChange={(e) => {
                  setMaxCalls(parseInt(e.target.value) || 0);
                  setMaxCallsManuallyEdited(true);
                }}
                min="1"
                max="1000"
                className="w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Agent will make up to {maxCalls} calls per day
              </p>
              <button
                type="button"
                onClick={() => {
                  setMaxCalls(autoMaxCalls);
                  setMaxCallsManuallyEdited(false);
                }}
                className="mt-2 text-xs font-medium text-primary underline underline-offset-4"
              >
                Use auto-calculated value ({autoMaxCalls})
              </button>
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
            if (currentStep < LOCAL_FORM_STEPS) {
              setCurrentStep(currentStep + 1);
            } else {
              handleComplete();
            }
          }}
          disabled={!canProceed()}
          className="gap-2"
        >
          {currentStep === LOCAL_FORM_STEPS ? 'Continue to Agent Setup' : 'Continue'}
          {currentStep < LOCAL_FORM_STEPS && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
