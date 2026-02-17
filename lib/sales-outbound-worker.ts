import { promises as fs } from 'fs';
import path from 'path';
import { formatInTimeZone } from 'date-fns-tz';
import { createServiceClient } from '@/lib/supabase/server';
import { createRetellPhoneCall } from '@/lib/retell/client';
import { parseCsv, normalizeHeader } from '@/lib/csv-utils';
import { readSheet } from '@/lib/google-sheets';

type SalesScheduleType = 'daily' | 'weekly' | 'custom';
type RecurrenceUnit = 'day' | 'week' | 'month';

type SalesAgentSchedule = {
  type: SalesScheduleType;
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  callIntervalMinutes?: number;
  customStartDate?: string;
  customMode?: 'pattern' | 'specific';
  specificDateTimes?: Array<{
    date: string;
    time: string;
  }>;
  recurrence?: {
    enabled: boolean;
    interval: number;
    unit: RecurrenceUnit;
  };
};

type SalesAgentConfig = {
  dataSource?: 'google_sheets' | 'csv_upload';
  inputSheetId?: string;
  inputSheetName?: string;
  csvFileId?: string;
  schedule?: SalesAgentSchedule;
  maxCallsPerDay?: number;
  retryLogic?: {
    noAnswer?: {
      enabled?: boolean;
      attempts?: number;
      hoursApart?: number;
    };
  };
};

type Prospect = {
  businessName: string;
  phoneNumber: string;
  industry?: string;
  contactPerson?: string;
  description?: string;
  status?: string;
};

type WorkerState = {
  inFlightByAgent: Record<string, { phoneNumber: string; at: string }>;
  processedSpecificSlotsByAgent: Record<string, string[]>;
};

const STATE_DIR = path.join(process.cwd(), 'data', 'sales', 'state');
const STATE_FILE = path.join(STATE_DIR, 'outbound-worker.json');
const DEFAULT_TIMEZONE = 'America/New_York';

const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseTimeToMinutes(value: string): number {
  const [h, m] = (value || '').split(':').map((v) => parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function safeTimezone(input?: string): string {
  if (!input) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: input });
    return input;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function localDayAndTime(now: Date, timezone: string) {
  const dateKey = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const hm = formatInTimeZone(now, timezone, 'HH:mm');
  const minutes = parseTimeToMinutes(hm);
  const weekdayName = formatInTimeZone(now, timezone, 'EEEE').toLowerCase();
  const day = DAY_MAP.includes(weekdayName) ? weekdayName : 'monday';
  return { dateKey, hm, minutes, day };
}

function isInWindow(nowMinutes: number, startTime: string, endTime: string): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start < 0 || end < 0) return false;
  return nowMinutes >= start && nowMinutes < end;
}

function daysBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
}

function monthsBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
}

function matchesCustomRecurrence(schedule: SalesAgentSchedule, localDate: string, localDay: string): boolean {
  const start = schedule.customStartDate;
  if (!start) return false;

  const dayDiff = daysBetween(start, localDate);
  if (dayDiff < 0) return false;

  const recurrence = schedule.recurrence;
  if (!recurrence || !recurrence.enabled) {
    return localDate === start;
  }

  const interval = Math.max(1, recurrence.interval || 1);
  const days = new Set((schedule.days || []).map((d) => d.toLowerCase()));
  if (days.size > 0 && !days.has(localDay)) return false;

  if (recurrence.unit === 'day') return dayDiff % interval === 0;
  if (recurrence.unit === 'week') return Math.floor(dayDiff / 7) % interval === 0;

  const monthDiff = monthsBetween(start, localDate);
  if (monthDiff < 0 || monthDiff % interval !== 0) return false;

  const startDay = new Date(`${start}T00:00:00Z`).getUTCDate();
  const currentDay = new Date(`${localDate}T00:00:00Z`).getUTCDate();
  return startDay === currentDay;
}

function getActiveSpecificSlotKey(
  schedule: SalesAgentSchedule,
  now: Date,
  timezone: string,
  processedSlots: string[]
): string | null {
  const slots = schedule.specificDateTimes || [];
  if (!slots.length) return null;

  const { dateKey, minutes } = localDayAndTime(now, timezone);
  const windowMinutes = 1; // cron runs every minute

  for (const slot of slots) {
    if (!slot?.date || !slot?.time) continue;
    if (slot.date !== dateKey) continue;

    const slotMinutes = parseTimeToMinutes(slot.time);
    if (slotMinutes < 0) continue;
    if (minutes < slotMinutes || minutes >= slotMinutes + windowMinutes) continue;

    const slotKey = `${slot.date}T${slot.time}`;
    if (processedSlots.includes(slotKey)) continue;
    return slotKey;
  }

  return null;
}

function evaluateSchedule(
  schedule: SalesAgentSchedule,
  now: Date,
  processedSlots: string[]
): { active: boolean; slotKey?: string } {
  const timezone = safeTimezone(schedule.timezone);
  const customMode = schedule.customMode || 'pattern';

  if (schedule.type === 'custom' && customMode === 'specific') {
    const slotKey = getActiveSpecificSlotKey(schedule, now, timezone, processedSlots);
    return slotKey ? { active: true, slotKey } : { active: false };
  }

  const { dateKey, minutes, day } = localDayAndTime(now, timezone);
  if (!isInWindow(minutes, schedule.startTime, schedule.endTime)) return { active: false };

  const days = new Set((schedule.days || []).map((d) => d.toLowerCase()));
  if (schedule.type === 'daily') return { active: true };
  if (schedule.type === 'weekly') return { active: days.size > 0 ? days.has(day) : false };
  return { active: matchesCustomRecurrence(schedule, dateKey, day) };
}

function normalizePhoneForDial(raw: string): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');

  if (hasPlus && digits.length >= 8) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function isProspectCallable(status?: string): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase().trim();
  return !(
    normalized.includes('do not call') ||
    normalized.includes('dnc') ||
    normalized.includes('not interested') ||
    normalized.includes('wrong number') ||
    normalized.includes('closed')
  );
}

function mapProspects(headers: string[], rows: string[][]): Prospect[] {
  const normalized = headers.map((h) => normalizeHeader(h));
  const indexOf = (...candidates: string[]) => {
    for (const c of candidates) {
      const idx = normalized.indexOf(normalizeHeader(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const businessNameIdx = indexOf('business_name', 'business name', 'name');
  const phoneIdx = indexOf('business_phone', 'business phone', 'phone', 'phone_number');
  const industryIdx = indexOf('business_industry', 'industry');
  const contactIdx = indexOf('business_contact_person', 'contact_person', 'contact');
  const descriptionIdx = indexOf('business_description', 'description');
  const statusIdx = indexOf('status', 'call_status', 'prospect_status');

  if (businessNameIdx < 0 || phoneIdx < 0) return [];

  return rows
    .map((row) => ({
      businessName: row[businessNameIdx]?.trim(),
      phoneNumber: row[phoneIdx]?.trim(),
      industry: industryIdx >= 0 ? row[industryIdx]?.trim() : undefined,
      contactPerson: contactIdx >= 0 ? row[contactIdx]?.trim() : undefined,
      description: descriptionIdx >= 0 ? row[descriptionIdx]?.trim() : undefined,
      status: statusIdx >= 0 ? row[statusIdx]?.trim() : undefined,
    }))
    .filter((row) => row.businessName && row.phoneNumber && isProspectCallable(row.status));
}

async function getGoogleAccessTokenForTenant(supabase: any, tenantId: string): Promise<string | null> {
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (!userTenant?.user_id) return null;

  const { data: tokenData } = await supabase
    .from('google_auth_tokens')
    .select('access_token')
    .eq('user_id', userTenant.user_id)
    .single();

  return tokenData?.access_token || null;
}

async function loadProspects(supabase: any, tenantId: string, config: SalesAgentConfig): Promise<Prospect[]> {
  const dataSource = config.dataSource || 'google_sheets';

  if (dataSource === 'csv_upload' && config.csvFileId) {
    const csvPath = path.join(process.cwd(), 'data', 'sales', 'uploads', config.csvFileId);
    const content = await fs.readFile(csvPath, 'utf-8');
    const { headers, rows } = parseCsv(content);
    return mapProspects(headers, rows);
  }

  if (dataSource === 'google_sheets' && config.inputSheetId && config.inputSheetName) {
    const accessToken = await getGoogleAccessTokenForTenant(supabase, tenantId);
    if (!accessToken) return [];
    const values = await readSheet(config.inputSheetId, `${config.inputSheetName}!A:Z`, accessToken);
    if (!values.length) return [];

    const [headerRow, ...rows] = values as string[][];
    return mapProspects(headerRow || [], rows || []);
  }

  return [];
}

async function readState(): Promise<WorkerState> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      inFlightByAgent: parsed?.inFlightByAgent || {},
      processedSpecificSlotsByAgent: parsed?.processedSpecificSlotsByAgent || {},
    };
  } catch {
    return { inFlightByAgent: {}, processedSpecificSlotsByAgent: {} };
  }
}

async function writeState(state: WorkerState) {
  // keep state bounded
  for (const agentId of Object.keys(state.processedSpecificSlotsByAgent || {})) {
    const unique = Array.from(new Set(state.processedSpecificSlotsByAgent[agentId] || []));
    state.processedSpecificSlotsByAgent[agentId] = unique.slice(-500);
  }
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function currentlyInFlight(state: WorkerState, agentId: string, now: Date): boolean {
  const item = state.inFlightByAgent[agentId];
  if (!item?.at) return false;
  const ageMs = now.getTime() - new Date(item.at).getTime();
  return ageMs < 30 * 60 * 1000;
}

async function findOutboundNumber(supabase: any, tenantId: string, internalAgentId: string): Promise<string | null> {
  const { data } = await supabase
    .from('phone_numbers')
    .select('number')
    .eq('tenant_id', tenantId)
    .eq('outbound_agent_id', internalAgentId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  return data?.number || null;
}

async function getCallHistoryForProspect(
  supabase: any,
  agentId: string,
  phoneNumber: string
): Promise<Array<{ created_at: string; status: string }>> {
  const { data } = await supabase
    .from('calls')
    .select('created_at,status')
    .eq('agent_id', agentId)
    .eq('phone_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(10);
  return (data || []) as Array<{ created_at: string; status: string }>;
}

function canDialProspectByHistory(
  history: Array<{ created_at: string; status: string }>,
  retryLogic: SalesAgentConfig['retryLogic'],
  now: Date
): boolean {
  if (!history.length) return true;

  const latest = history[0];
  if (latest.status === 'completed') return false;

  const noAnswer = retryLogic?.noAnswer;
  if (!noAnswer?.enabled) return false;

  // attempts = retries after first attempt
  const maxTotalAttempts = Math.max(1, (noAnswer.attempts || 0) + 1);
  if (history.length >= maxTotalAttempts) return false;

  const minHours = Math.max(1, noAnswer.hoursApart || 1);
  const elapsedHours = (now.getTime() - new Date(latest.created_at).getTime()) / (60 * 60 * 1000);
  return elapsedHours >= minHours;
}

async function computeCallLimits(
  supabase: any,
  agentId: string,
  timezone: string,
  now: Date
): Promise<{ callsToday: number; lastCallAt: string | null }> {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('calls')
    .select('created_at')
    .eq('agent_id', agentId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  const rows = data || [];
  const localToday = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const callsToday = rows.filter((row: any) => formatInTimeZone(new Date(row.created_at), timezone, 'yyyy-MM-dd') === localToday).length;
  return {
    callsToday,
    lastCallAt: rows[0]?.created_at || null,
  };
}

export async function runSalesOutboundWorker(now = new Date()) {
  const supabase = await createServiceClient();
  const state = await readState();

  const { data: agents, error } = await supabase
    .from('voice_agents')
    .select('id, tenant_id, name, settings, retell_agent_id, status')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to load agents: ${error.message}`);
  }

  const summary = {
    scannedAgents: 0,
    eligibleAgents: 0,
    callsPlaced: 0,
    skipped: 0,
    errors: [] as Array<{ agentId: string; message: string }>,
    details: [] as Array<{ agentId: string; action: string; reason?: string; callId?: string; phone?: string }>,
  };

  for (const agent of agents || []) {
    summary.scannedAgents += 1;
    const settings = (agent as any).settings || {};
    const salesConfig = settings.salesAgentConfig as SalesAgentConfig | undefined;
    const templateId = settings.template_id as string | undefined;

    if (!agent.retell_agent_id || !salesConfig || templateId !== 'sales-agent-outbound') {
      continue;
    }

    const schedule = salesConfig.schedule;
    if (!schedule) {
      summary.skipped += 1;
      summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'missing_schedule' });
      continue;
    }

    const timezone = safeTimezone(schedule.timezone);
    const processedSlots = state.processedSpecificSlotsByAgent[agent.id] || [];
    const scheduleEval = evaluateSchedule(schedule, now, processedSlots);
    if (!scheduleEval.active) {
      summary.skipped += 1;
      summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'outside_schedule' });
      continue;
    }

    if (currentlyInFlight(state, agent.id, now)) {
      summary.skipped += 1;
      summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'in_flight_window' });
      continue;
    }

    summary.eligibleAgents += 1;

    try {
      const intervalMinutes = Math.max(1, schedule.callIntervalMinutes || 15);
      const maxCallsPerDay = Math.max(1, salesConfig.maxCallsPerDay || 100);

      const { callsToday, lastCallAt } = await computeCallLimits(supabase, agent.id, timezone, now);
      if (callsToday >= maxCallsPerDay) {
        summary.skipped += 1;
        summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'daily_limit_reached' });
        continue;
      }

      const isSpecificCustom = schedule.type === 'custom' && (schedule.customMode || 'pattern') === 'specific';
      if (!isSpecificCustom && lastCallAt) {
        const deltaMinutes = Math.floor((now.getTime() - new Date(lastCallAt).getTime()) / (60 * 1000));
        if (deltaMinutes < intervalMinutes) {
          summary.skipped += 1;
          summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'interval_not_reached' });
          continue;
        }
      }

      const fromNumber = await findOutboundNumber(supabase, agent.tenant_id, agent.id);
      if (!fromNumber) {
        summary.skipped += 1;
        summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'no_outbound_number' });
        continue;
      }

      const prospects = await loadProspects(supabase, agent.tenant_id, salesConfig);
      if (!prospects.length) {
        summary.skipped += 1;
        summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'no_prospects' });
        continue;
      }

      let nextProspect: Prospect | null = null;
      let dialTo: string | null = null;

      for (const candidate of prospects) {
        const normalizedPhone = normalizePhoneForDial(candidate.phoneNumber);
        if (!normalizedPhone) continue;
        const history = await getCallHistoryForProspect(supabase, agent.id, normalizedPhone);
        if (!canDialProspectByHistory(history, salesConfig.retryLogic, now)) continue;
        nextProspect = candidate;
        dialTo = normalizedPhone;
        break;
      }

      if (!nextProspect || !dialTo) {
        summary.skipped += 1;
        summary.details.push({ agentId: agent.id, action: 'skipped', reason: 'all_prospects_exhausted' });
        continue;
      }

      const localIso = formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
      const spokenNow = formatInTimeZone(now, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");

      const callResult = await createRetellPhoneCall({
        fromNumber,
        toNumber: dialTo,
        overrideAgentId: agent.retell_agent_id,
        retellLlmDynamicVariables: {
          current_call_datetime: spokenNow,
          current_call_local_iso: localIso,
          current_call_timezone: timezone,
          business_name: nextProspect.businessName || '',
          business_phone: dialTo,
          business_industry: nextProspect.industry || '',
          business_contact_person: nextProspect.contactPerson || '',
          business_description: nextProspect.description || '',
        },
        metadata: {
          source: 'sales_outbound_worker',
          local_datetime: localIso,
          timezone,
          agent_id: agent.id,
          tenant_id: agent.tenant_id,
          business_name: nextProspect.businessName || '',
          business_phone: dialTo,
        },
      });

      if (callResult.error || !callResult.data) {
        summary.errors.push({ agentId: agent.id, message: callResult.error || 'Unknown call creation error' });
        summary.details.push({ agentId: agent.id, action: 'error', reason: 'retell_call_failed', phone: dialTo });
        continue;
      }

      state.inFlightByAgent[agent.id] = {
        phoneNumber: dialTo,
        at: now.toISOString(),
      };
      if (scheduleEval.slotKey) {
        state.processedSpecificSlotsByAgent[agent.id] = [
          ...(state.processedSpecificSlotsByAgent[agent.id] || []),
          scheduleEval.slotKey,
        ];
      }

      summary.callsPlaced += 1;
      summary.details.push({
        agentId: agent.id,
        action: 'placed_call',
        phone: dialTo,
        callId: (callResult.data as any)?.call_id || undefined,
      });
    } catch (workerError: any) {
      summary.errors.push({
        agentId: agent.id,
        message: workerError?.message || 'Unhandled agent worker error',
      });
      summary.details.push({ agentId: agent.id, action: 'error', reason: 'unhandled_exception' });
    }
  }

  await writeState(state);
  return summary;
}
