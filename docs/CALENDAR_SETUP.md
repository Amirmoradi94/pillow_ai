# Custom Calendar System Setup Guide

This guide will help you set up and configure the custom calendar system that replaces Cal.com integration.

## Overview

The custom calendar system provides:
- Google Calendar two-way sync
- Voice agent appointment booking via Retell
- Multi-tenant team scheduling
- Flexible availability rules
- Automatic conflict detection

## Prerequisites

1. Supabase project with database access
2. Google Cloud Project with Calendar API enabled
3. Retell AI account for voice agents
4. Node.js 18+ and npm

---

## Step 1: Database Setup

### Run the Migration

The calendar system requires new database tables. Run the migration:

```bash
# If using Supabase CLI
supabase db push

# Or manually apply the migration file
# Upload supabase/migrations/003_calendar_system.sql to Supabase Dashboard
```

This creates:
- `calendar_providers` - OAuth credentials for Google Calendar
- `calendar_events` - All events (synced and internal)
- `availability_rules` - User working hours
- `booking_settings` - Agent booking configuration

### Verify Tables

Check in Supabase Dashboard > Table Editor that all 4 tables exist with RLS policies enabled.

---

## Step 2: Google Calendar API Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Click Enable

### 2. Configure OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. Choose **External** user type
3. Fill in required fields:
   - App name: "Pillow AI Calendar"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Save and continue

### 3. Create OAuth Credentials

1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: "Pillow AI"
5. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/calendar/google/callback`
   - Production: `https://your-domain.com/api/calendar/google/callback`
6. Click Create and **save the Client ID and Client Secret**

---

## Step 3: Environment Variables

### 1. Generate Security Keys

Generate random keys for encryption and API security:

```bash
# Calendar encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Internal API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Cron secret (optional)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update .env.local

Add to your `.env.local` file:

```env
# Google Calendar API
GOOGLE_OAUTH_CLIENT_ID=your_client_id_from_step_2
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_from_step_2
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Calendar System Security
CALENDAR_ENCRYPTION_KEY=your_generated_32_byte_key
INTERNAL_API_KEY=your_generated_api_key

# Cron Job Security (production)
CRON_SECRET=your_cron_secret

# App URL (important for Retell webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Production Environment

For production (Vercel/other):
1. Add all environment variables to hosting platform
2. Update `GOOGLE_OAUTH_REDIRECT_URI` to production URL
3. Update `NEXT_PUBLIC_APP_URL` to production domain

---

## Step 4: Configure Availability Rules

Users need to set their working hours before bookings can be made.

### Via API (for bulk setup):

```bash
curl -X POST http://localhost:3000/api/calendar/availability-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "name": "Default Availability",
    "schedule": {
      "monday": [{"start": "09:00", "end": "17:00"}],
      "tuesday": [{"start": "09:00", "end": "17:00"}],
      "wednesday": [{"start": "09:00", "end": "17:00"}],
      "thursday": [{"start": "09:00", "end": "17:00"}],
      "friday": [{"start": "09:00", "end": "12:00"}]
    },
    "timezone": "America/Los_Angeles",
    "slot_duration": 30,
    "buffer_before": 0,
    "buffer_after": 0,
    "min_booking_notice": 60,
    "max_booking_notice": 43200,
    "is_default": true,
    "active": true
  }'
```

### Via UI (when implemented):

1. Go to Dashboard → Calendar → Availability Settings
2. Set working hours for each day
3. Configure buffer times and slot duration
4. Save as default

---

## Step 5: Configure Booking Settings (Admin)

Set up how appointments are distributed across team members.

### Create Booking Settings:

```bash
curl -X POST http://localhost:3000/api/calendar/booking-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "tenant_id": "your-tenant-id",
    "agent_id": "your-agent-id",
    "assignable_users": [
      {
        "user_id": "user-1-id",
        "priority": 1,
        "calendar_provider_id": "provider-1-id"
      },
      {
        "user_id": "user-2-id",
        "priority": 2,
        "calendar_provider_id": "provider-2-id"
      }
    ],
    "distribution_strategy": "round_robin",
    "event_type_config": {
      "duration": 30,
      "title_template": "Appointment with {{customer_name}}",
      "description_template": "Phone: {{customer_phone}}\\nEmail: {{customer_email}}\\nNotes: {{notes}}"
    },
    "notifications": {
      "send_email": true,
      "send_sms": true
    }
  }'
```

### Distribution Strategies:

- **round_robin**: Rotate bookings evenly across team
- **least_busy**: Assign to user with fewest upcoming appointments
- **priority**: Assign based on priority numbers (lower = higher priority)
- **specific_user**: Always use first user in assignable_users list

---

## Step 6: Connect Google Calendar (User)

### For Each Team Member:

1. Log in to the dashboard
2. Go to **Calendar** → **Connect Google Calendar**
3. Click "Connect Google Calendar" button
4. Sign in with Google account
5. Grant calendar permissions
6. Wait for initial sync to complete (~30 seconds)

### Verify Connection:

- Check Calendar Providers table in Supabase
- Status should be "active"
- `last_synced_at` should be recent
- Events should appear in `calendar_events` table

---

## Step 7: Update Voice Agents

### Automatic (New Agents):

When creating new agents, the system will automatically use the custom calendar tools if:
1. Agent ID is available
2. `NEXT_PUBLIC_APP_URL` is configured
3. `INTERNAL_API_KEY` is set

### Manual (Existing Agents):

Update existing agents to use new calendar tools:

```typescript
// In agent creation/update code
import { RetellTools } from '@/lib/retell-tools';

const tools = [
  RetellTools.checkCalendarAvailability({
    name: 'check_availability',
    description: 'Check available appointment slots',
    apiUrl: process.env.NEXT_PUBLIC_APP_URL!,
    agentId: agentId,
  }),
  RetellTools.bookCalendarAppointment({
    name: 'book_appointment',
    description: 'Book an appointment',
    apiUrl: process.env.NEXT_PUBLIC_APP_URL!,
    agentId: agentId,
  }),
];
```

---

## Step 8: Set Up Sync Cron Job (Production)

### Option A: Vercel Cron

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/calendar-sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Option B: External Cron Service

Use a service like Cron-Job.org or GitHub Actions:

```bash
# Trigger every 5 minutes
curl -X POST https://your-domain.com/api/cron/calendar-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Verify Sync:

- Check `last_synced_at` in `calendar_providers` table
- Should update every 5 minutes
- Check application logs for sync results

---

## Testing

### 1. Test Availability Check (API)

```bash
curl "http://localhost:3000/api/calendar/availability?date=2024-02-15" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

Expected response:
```json
{
  "date": "2024-02-15",
  "timezone": "UTC",
  "slots": [
    {
      "start_time": "2024-02-15T09:00:00Z",
      "end_time": "2024-02-15T09:30:00Z",
      "user_id": "user-id",
      "user_name": "user@example.com"
    }
  ],
  "total": 10
}
```

### 2. Test Booking (API)

```bash
curl -X POST http://localhost:3000/api/calendar/booking \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2024-02-15T09:00:00Z",
    "duration": 30,
    "attendee": {
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "notes": "Interested in product demo"
  }'
```

### 3. Test Voice Agent Booking

1. Create a test call with your voice agent
2. Say: "I'd like to book an appointment"
3. Agent should check availability
4. Provide date/time when prompted
5. Verify booking appears in database and Google Calendar

---

## Troubleshooting

### Google Calendar Not Syncing

**Check:**
1. Provider status in database (should be "active")
2. Token expiry (`token_expires_at` in future)
3. Sync enabled (`sync_enabled = true`)
4. Application logs for sync errors

**Fix:**
```sql
-- Check provider status
SELECT id, status, last_synced_at, sync_enabled
FROM calendar_providers
WHERE user_id = 'your-user-id';

-- Re-enable sync if disabled
UPDATE calendar_providers
SET sync_enabled = true, status = 'active'
WHERE id = 'provider-id';
```

### Token Expired Error

**Fix:** Reconnect Google Calendar
1. Disconnect existing connection
2. Connect again to get fresh tokens

### No Available Slots

**Check:**
1. Availability rules exist and are active
2. Working hours configured for requested date
3. No conflicting events
4. Min/max booking notice settings

```sql
-- Check availability rules
SELECT * FROM availability_rules
WHERE user_id = 'user-id' AND active = true;

-- Check for conflicts
SELECT * FROM calendar_events
WHERE user_id = 'user-id'
AND start_time::date = '2024-02-15'
AND status != 'cancelled';
```

### Voice Agent Can't Book

**Check:**
1. `INTERNAL_API_KEY` set correctly
2. `NEXT_PUBLIC_APP_URL` points to correct domain
3. Agent ID passed to tool configuration
4. Booking settings exist for agent/tenant

**Verify:**
```bash
# Test Retell endpoint directly
curl -X POST http://localhost:3000/api/calendar/booking/retell \
  -H "X-Agent-ID: your-agent-id" \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date_time": "2024-02-15T09:00:00Z",
    "duration": 30,
    "customer_name": "Test User",
    "customer_phone": "+1234567890"
  }'
```

---

## Migration from Cal.com

### For Existing Agents Using Cal.com:

1. Set up booking settings for each agent (Step 5)
2. Ensure team members have availability rules (Step 4)
3. Connect Google Calendars for team members (Step 6)
4. Update agent configuration to use new tools
5. Test thoroughly before removing Cal.com credentials
6. Remove `cal_api_key` and `cal_event_type_id` from agent settings

### Gradual Migration:

The system supports both Cal.com and custom calendar tools simultaneously. You can:
1. Migrate one agent at a time
2. Test with new system
3. Roll back to Cal.com if issues
4. Complete migration when confident

---

## Monitoring & Maintenance

### Key Metrics to Monitor:

1. **Sync Success Rate**
   - Check cron job logs
   - Target: 95%+ success rate

2. **Booking Success Rate**
   - Monitor API logs
   - Track conflict/error rates

3. **Token Refresh**
   - Alert on expired tokens
   - Auto-refresh should handle this

4. **API Response Times**
   - Availability checks: < 500ms
   - Booking creation: < 1s

### Regular Maintenance:

- Review and clean up old events (older than 90 days)
- Audit availability rules for accuracy
- Update booking settings as team changes
- Monitor disk usage (events table can grow)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review application logs
3. Check Supabase database directly
4. Consult Google Calendar API docs: https://developers.google.com/calendar

---

## Next Steps

After setup is complete:
1. Build calendar UI components (planned)
2. Add email/SMS confirmations
3. Implement recurring events
4. Add team calendar view
5. Create analytics dashboard
