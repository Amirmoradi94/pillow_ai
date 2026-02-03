/**
 * Free Trial System Utilities
 * Handles trial status checking, usage tracking, and feature access control
 */

import { createClient } from '@/lib/supabase/server';

// Trial configuration (Option B)
export const TRIAL_CONFIG = {
  DURATION_DAYS: 14,
  MINUTES_ALLOWED: 50,
  FEATURES: {
    max_agents: 1,
    max_phone_numbers: 1,
    custom_voice_cloning: false,
    advanced_analytics: false,
    crm_integration: false,
    api_access: false,
    priority_support: false,
    availability_24_7: false,
    team_members_allowed: 1,
    voice_options: 3,
    calendar_integration: 'basic',
    webhook_support: true,
    email_notifications: true,
  },
} as const;

// Plan configurations
export const PLAN_CONFIG = {
  starter: {
    minutes: 200,
    price: { monthly: 49, yearly: 39 },
    features: {
      max_agents: 1,
      max_phone_numbers: 1,
      custom_voice_cloning: false,
      advanced_analytics: false,
      crm_integration: false,
      api_access: false,
      priority_support: false,
      availability_24_7: false,
      team_members_allowed: 1,
      voice_options: 5,
    },
  },
  growth: {
    minutes: 750,
    price: { monthly: 149, yearly: 119 },
    features: {
      max_agents: 3,
      max_phone_numbers: 2,
      custom_voice_cloning: true,
      advanced_analytics: true,
      crm_integration: true,
      api_access: false,
      priority_support: true,
      availability_24_7: true,
      team_members_allowed: 3,
      voice_options: 999,
    },
  },
  business: {
    minutes: 9999999, // Unlimited
    price: { monthly: 349, yearly: 279 },
    features: {
      max_agents: 999,
      max_phone_numbers: 5,
      custom_voice_cloning: true,
      advanced_analytics: true,
      crm_integration: true,
      api_access: true,
      priority_support: true,
      availability_24_7: true,
      team_members_allowed: 999,
      voice_options: 999,
    },
  },
} as const;

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
export type SubscriptionPlan = 'trial' | 'starter' | 'growth' | 'business';

export interface TenantUsage {
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  is_trial: boolean;
  trial_days_remaining: number;
  trial_minutes_allowed: number;
  trial_minutes_used: number;
  trial_minutes_remaining: number;
  plan_minutes_allowed: number;
  plan_minutes_used: number;
  plan_minutes_remaining: number;
  trial_end_date: string | null;
  can_make_calls: boolean;
}

/**
 * Get comprehensive usage statistics for a tenant
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_tenant_usage', {
    tenant_uuid: tenantId,
  });

  if (error) {
    console.error('Error fetching tenant usage:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Check if tenant can make a call (has minutes remaining and trial not expired)
 */
export async function canMakeCall(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usage?: TenantUsage;
}> {
  const usage = await getTenantUsage(tenantId);

  if (!usage) {
    return {
      allowed: false,
      reason: 'Unable to fetch usage data',
    };
  }

  if (!usage.can_make_calls) {
    if (usage.is_trial && usage.trial_days_remaining <= 0) {
      return {
        allowed: false,
        reason: 'Trial has expired. Please upgrade to continue.',
        usage,
      };
    }

    if (usage.is_trial && usage.trial_minutes_remaining <= 0) {
      return {
        allowed: false,
        reason: 'Trial minutes exhausted. Please upgrade to continue.',
        usage,
      };
    }

    if (!usage.is_trial && usage.plan_minutes_remaining <= 0) {
      return {
        allowed: false,
        reason: 'Monthly minute limit reached. Upgrade your plan or wait for reset.',
        usage,
      };
    }

    return {
      allowed: false,
      reason: 'Subscription inactive',
      usage,
    };
  }

  return {
    allowed: true,
    usage,
  };
}

/**
 * Check if tenant has access to a specific feature
 */
export async function hasFeatureAccess(
  tenantId: string,
  feature: keyof typeof TRIAL_CONFIG.FEATURES
): Promise<boolean> {
  const supabase = createClient();

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('features')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    console.error('Error fetching tenant features:', error);
    return false;
  }

  return tenant.features?.[feature] === true;
}

/**
 * Get trial status with user-friendly messages
 */
export async function getTrialStatus(tenantId: string): Promise<{
  isActive: boolean;
  daysRemaining: number;
  minutesRemaining: number;
  message: string;
  urgency: 'none' | 'low' | 'medium' | 'high';
}> {
  const usage = await getTenantUsage(tenantId);

  if (!usage || !usage.is_trial) {
    return {
      isActive: false,
      daysRemaining: 0,
      minutesRemaining: 0,
      message: 'Not on trial',
      urgency: 'none',
    };
  }

  const daysRemaining = usage.trial_days_remaining;
  const minutesRemaining = usage.trial_minutes_remaining;

  let message = '';
  let urgency: 'none' | 'low' | 'medium' | 'high' = 'none';

  // Determine urgency and message
  if (daysRemaining <= 0) {
    message = 'Your trial has ended. Upgrade now to continue.';
    urgency = 'high';
  } else if (daysRemaining <= 2) {
    message = `Only ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your trial!`;
    urgency = 'high';
  } else if (daysRemaining <= 5) {
    message = `${daysRemaining} days remaining in your trial.`;
    urgency = 'medium';
  } else if (minutesRemaining <= 10) {
    message = `Only ${minutesRemaining} minutes left in your trial!`;
    urgency = 'medium';
  } else if (minutesRemaining <= 20) {
    message = `${minutesRemaining} minutes remaining.`;
    urgency = 'low';
  } else {
    message = `${daysRemaining} days and ${minutesRemaining} minutes remaining.`;
    urgency = 'none';
  }

  return {
    isActive: true,
    daysRemaining,
    minutesRemaining,
    message,
    urgency,
  };
}

/**
 * Track a trial event
 */
export async function trackTrialEvent(
  tenantId: string,
  eventType:
    | 'trial_started'
    | 'trial_ended'
    | 'trial_converted'
    | 'trial_expired'
    | 'reminder_sent_day_7'
    | 'reminder_sent_day_12'
    | 'reminder_sent_day_14',
  eventData: Record<string, any> = {}
) {
  const supabase = createClient();

  const { error } = await supabase.from('trial_events').insert({
    tenant_id: tenantId,
    event_type: eventType,
    event_data: eventData,
  });

  if (error) {
    console.error('Error tracking trial event:', error);
  }
}

/**
 * Convert trial to paid plan
 */
export async function convertTrialToPaid(
  tenantId: string,
  plan: 'starter' | 'growth' | 'business',
  billingCycle: 'monthly' | 'yearly',
  stripeSubscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const planConfig = PLAN_CONFIG[plan];

  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      subscription_plan: plan,
      subscription_start_date: new Date().toISOString(),
      plan_minutes_allowed: planConfig.minutes,
      plan_minutes_used: 0,
      plan_minutes_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      features: planConfig.features,
      converted_from_trial: true,
      conversion_date: new Date().toISOString(),
      stripe_subscription_id: stripeSubscriptionId,
    })
    .eq('id', tenantId);

  if (error) {
    console.error('Error converting trial to paid:', error);
    return { success: false, error: error.message };
  }

  // Track conversion event
  await trackTrialEvent(tenantId, 'trial_converted', {
    plan,
    billing_cycle: billingCycle,
  });

  return { success: true };
}

/**
 * Check if tenant needs trial reminder
 */
export async function checkTrialReminders(tenantId: string): Promise<{
  needsReminder: boolean;
  reminderType?: 'day_7' | 'day_12' | 'day_14';
}> {
  const supabase = createClient();

  const usage = await getTenantUsage(tenantId);

  if (!usage || !usage.is_trial) {
    return { needsReminder: false };
  }

  const daysRemaining = usage.trial_days_remaining;
  const trialDaysElapsed = 14 - daysRemaining;

  // Check if reminders have already been sent
  const { data: events } = await supabase
    .from('trial_events')
    .select('event_type')
    .eq('tenant_id', tenantId)
    .in('event_type', ['reminder_sent_day_7', 'reminder_sent_day_12', 'reminder_sent_day_14']);

  const sentReminders = new Set(events?.map((e) => e.event_type) || []);

  // Check which reminder to send
  if (trialDaysElapsed >= 7 && !sentReminders.has('reminder_sent_day_7')) {
    return { needsReminder: true, reminderType: 'day_7' };
  }

  if (trialDaysElapsed >= 12 && !sentReminders.has('reminder_sent_day_12')) {
    return { needsReminder: true, reminderType: 'day_12' };
  }

  if (daysRemaining === 0 && !sentReminders.has('reminder_sent_day_14')) {
    return { needsReminder: true, reminderType: 'day_14' };
  }

  return { needsReminder: false };
}

/**
 * Get usage percentage (for progress bars)
 */
export function getUsagePercentage(used: number, allowed: number): number {
  if (allowed === 0) return 0;
  return Math.min(Math.round((used / allowed) * 100), 100);
}

/**
 * Format minutes to hours and minutes
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
