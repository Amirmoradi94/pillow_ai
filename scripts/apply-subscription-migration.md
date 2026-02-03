# Subscription System Migration Guide

## Database Migration

To apply the subscription system to your database, run the SQL migration file:

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `/supabase/migrations/001_add_subscription_to_tenants.sql`
4. Run the SQL migration

### Using Supabase CLI:
```bash
supabase db push
```

## Subscription System Design

### Free Trial Configuration
- **Duration**: 14 days from signup
- **Minutes Included**: 100 minutes
- **Concurrent Calls**: 5 maximum
- **Status**: Auto-expires after 14 days

### Database Schema Changes

Added to `tenants` table:
- `subscription_tier` - Plan type (free_trial, basic, pro, enterprise)
- `subscription_status` - Status (active, expired, cancelled)
- `trial_ends_at` - Timestamp when trial expires
- `monthly_minutes_limit` - Total minutes allowed per period
- `minutes_used_current_period` - Minutes consumed this period
- `period_starts_at` - Billing period start date
- `period_ends_at` - Billing period end date
- `concurrency_limit` - Max simultaneous calls

### Usage Tracking

When a call ends, track usage by calling:
```typescript
POST /api/subscription/track-usage
{
  "tenantId": "tenant-uuid",
  "minutesUsed": 5
}
```

### Automatic Signup Process

New users automatically get:
- 14-day free trial
- 100 minutes
- 5 concurrent calls limit
- Active status until trial expires

## Next Steps

After migration, you may want to:
1. Create paid tier plans (basic, pro, enterprise)
2. Set up billing/payment integration
3. Add email notifications for trial expiration
4. Create admin dashboard for subscription management
