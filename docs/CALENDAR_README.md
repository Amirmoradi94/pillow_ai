# Custom Calendar System

## Overview

The Pillow AI platform includes a custom calendar system that enables voice agents to check availability and book appointments. The system integrates with Google Calendar for two-way synchronization and supports multi-tenant team scheduling.

## Key Features

- **Google Calendar Integration**: Two-way sync with Google Calendar via OAuth 2.0
- **Voice Agent Booking**: Voice agents can check availability and book appointments via Retell
- **Availability Management**: Flexible working hours, buffer times, and date overrides
- **Team Scheduling**: Distribute appointments across team members with multiple strategies
- **Conflict Detection**: Automatic conflict prevention and race condition protection
- **Multi-Tenant**: Complete tenant isolation with proper security
- **Token Security**: AES-256 encryption for OAuth tokens

## Quick Start

### 1. Set Up Google Calendar API

1. Create a Google Cloud Project
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add redirect URIs

See [CALENDAR_SETUP.md](./CALENDAR_SETUP.md) for detailed instructions.

### 2. Configure Environment Variables

```bash
# Copy example env file
cp .env.local.example .env.local

# Add your Google OAuth credentials
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Generate security keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env.local as CALENDAR_ENCRYPTION_KEY and INTERNAL_API_KEY
```

### 3. Run Database Migration

```bash
# Apply the calendar system migration
supabase db push
```

### 4. Connect Google Calendar

1. Log in to the dashboard
2. Navigate to Calendar settings
3. Click "Connect Google Calendar"
4. Grant permissions
5. Wait for initial sync

### 5. Configure Availability

Set your working hours and booking preferences:

```bash
curl -X POST http://localhost:3000/api/calendar/availability-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work Hours",
    "schedule": {
      "monday": [{"start": "09:00", "end": "17:00"}],
      "tuesday": [{"start": "09:00", "end": "17:00"}],
      "wednesday": [{"start": "09:00", "end": "17:00"}],
      "thursday": [{"start": "09:00", "end": "17:00"}],
      "friday": [{"start": "09:00", "end": "17:00"}]
    },
    "timezone": "America/Los_Angeles",
    "slot_duration": 30,
    "is_default": true
  }'
```

## Architecture

### Database Schema

```
calendar_providers     → OAuth credentials and sync state
calendar_events        → All events (synced + internal)
availability_rules     → User working hours and constraints
booking_settings       → Team assignment and distribution
```

### API Endpoints

**OAuth Flow:**
- `GET /api/calendar/google/connect` - Start OAuth
- `GET /api/calendar/google/callback` - OAuth callback
- `DELETE /api/calendar/google/disconnect/:id` - Disconnect

**Calendar Operations:**
- `GET /api/calendar/events` - List events
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/availability` - Check available slots
- `POST /api/calendar/booking` - Book appointment

**Voice Agent Integration:**
- `POST /api/calendar/availability/retell` - Check availability
- `POST /api/calendar/booking/retell` - Book appointment

**Sync:**
- `POST /api/calendar/sync` - Manual sync
- `GET /api/cron/calendar-sync` - Automated sync (every 5 min)

### Distribution Strategies

**Round Robin**: Distribute bookings evenly across team
**Least Busy**: Assign to user with fewest upcoming appointments
**Priority**: Use priority rankings (lower number = higher priority)
**Specific User**: Always assign to a specific team member

## Usage Examples

### Check Availability

```javascript
const response = await fetch('/api/calendar/availability?date=2024-02-15');
const data = await response.json();

console.log(data.slots);
// [
//   {
//     start_time: "2024-02-15T09:00:00Z",
//     end_time: "2024-02-15T09:30:00Z",
//     user_id: "...",
//     user_name: "user@example.com"
//   }
// ]
```

### Book Appointment

```javascript
const response = await fetch('/api/calendar/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start_time: '2024-02-15T09:00:00Z',
    duration: 30,
    attendee: {
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com'
    },
    notes: 'Product demo'
  })
});

const booking = await response.json();
console.log(booking.confirmation_code); // ABC123XYZ
```

### Voice Agent Integration

Voice agents automatically use the calendar system when configured:

```typescript
// Agent tools are automatically generated
import { generateTools } from '@/lib/agent-templates';

const tools = generateTools(
  { booking: true, availability: true },
  { agentId: 'agent-id' }
);

// Creates custom webhook tools for Retell
// Voice agent can now say:
// "I'd like to book an appointment"
// Agent will check availability and book
```

## Configuration

### Availability Rules

Configure working hours, buffer times, and constraints:

```json
{
  "schedule": {
    "monday": [
      { "start": "09:00", "end": "12:00" },
      { "start": "13:00", "end": "17:00" }
    ]
  },
  "timezone": "America/Los_Angeles",
  "slot_duration": 30,
  "buffer_before": 5,
  "buffer_after": 5,
  "min_booking_notice": 60,
  "max_booking_notice": 43200,
  "date_overrides": [
    { "date": "2024-12-25", "available": false, "reason": "Holiday" }
  ]
}
```

### Booking Settings

Configure team assignment for voice agents:

```json
{
  "assignable_users": [
    {
      "user_id": "user-1",
      "priority": 1,
      "calendar_provider_id": "provider-1"
    }
  ],
  "distribution_strategy": "round_robin",
  "event_type_config": {
    "duration": 30,
    "title_template": "Appointment with {{customer_name}}",
    "description_template": "Phone: {{customer_phone}}\nNotes: {{notes}}"
  },
  "notifications": {
    "send_email": true,
    "send_sms": true
  }
}
```

## Sync Mechanism

### Initial Sync

When a user connects Google Calendar:
1. Fetches events from past 30 days
2. Fetches events for next 90 days
3. Stores events in database
4. Saves sync token for incremental updates

### Incremental Sync

Every 5 minutes via cron job:
1. Uses Google's sync tokens
2. Only fetches changed events
3. Updates/creates/deletes as needed
4. Handles sync token expiry gracefully

### Bidirectional Sync

- **Google → App**: Automatic via cron job
- **App → Google**: Automatic when creating/updating events

## Security

### Token Encryption

OAuth tokens are encrypted with AES-256 before storage:

```typescript
import { encryptToken, decryptToken } from '@/lib/google-calendar/tokens';

const encrypted = encryptToken(accessToken);
// Store in database

const decrypted = decryptToken(encrypted);
// Use for API calls
```

### API Authentication

**User Endpoints**: Supabase JWT authentication
**Voice Agent Endpoints**: Internal API key + agent ID verification

```typescript
// Retell webhook authentication
headers: {
  'Authorization': `Bearer ${INTERNAL_API_KEY}`,
  'X-Agent-ID': agentId
}
```

### Row Level Security

All tables use RLS policies for tenant isolation:

```sql
-- Users can only see events in their tenant
CREATE POLICY "events_tenant_isolation"
ON calendar_events FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
));
```

## Monitoring

### Key Metrics

- **Sync Success Rate**: Target 95%+
- **Availability Response Time**: Target <500ms
- **Booking Success Rate**: Track conflicts and errors
- **Token Refresh**: Monitor expired/failed refreshes

### Logging

Check application logs for:
- Sync job results
- Token refresh attempts
- Booking conflicts
- API errors

## Troubleshooting

### Events Not Syncing

1. Check provider status: Should be "active"
2. Verify token expiry: Should be in future
3. Check sync enabled: Should be true
4. Review cron job logs

### No Available Slots

1. Verify availability rules exist and are active
2. Check working hours for requested date
3. Confirm no conflicting events
4. Review min/max booking notice settings

### Voice Agent Can't Book

1. Verify INTERNAL_API_KEY is set
2. Check NEXT_PUBLIC_APP_URL is correct
3. Ensure agent ID is passed to tools
4. Verify booking settings exist

See [CALENDAR_SETUP.md](./CALENDAR_SETUP.md) for detailed troubleshooting.

## Migration from Cal.com

The system supports both Cal.com and custom calendar simultaneously:

1. Set up custom calendar for new agents
2. Gradually migrate existing agents
3. Test thoroughly before removing Cal.com
4. Remove Cal.com credentials when migration complete

## Future Enhancements

Planned features:
- Email/SMS confirmations
- Recurring events (RRULE)
- Team calendar view
- Customer self-service rescheduling
- Analytics dashboard
- Microsoft Outlook integration
- Apple iCloud integration

## Documentation

- **Setup Guide**: [CALENDAR_SETUP.md](./CALENDAR_SETUP.md)
- **Implementation Details**: [CALENDAR_IMPLEMENTATION_SUMMARY.md](./CALENDAR_IMPLEMENTATION_SUMMARY.md)
- **API Reference**: See inline code documentation

## Support

For issues or questions:
1. Check the troubleshooting guide
2. Review application logs
3. Inspect database directly
4. Consult Google Calendar API docs

## License

Part of the Pillow AI platform. See main LICENSE file.
