# Free Trial System Documentation

## Overview
Pillow AI offers a **14-day free trial** with **50 minutes of calls** to let users experience the full power of AI voice agents without any commitment.

## Trial Package (Option B)

### What's Included
- **Duration:** 14 days
- **Call Minutes:** 50 minutes
- **Credit Card:** Not required to start
- **AI Agents:** 1 voice agent
- **Phone Numbers:** 1 temporary test number
- **Voice Options:** 3 preset AI voices (no custom cloning)
- **Analytics:** Basic call history and transcripts
- **Support:** Email support (24-hour response)
- **Availability:** Business hours only (9 AM - 6 PM)
- **Integrations:** Basic (Google Calendar read-only, email notifications)

### Restrictions (Upgrade Required)
❌ No custom voice cloning
❌ No advanced analytics/exports
❌ No CRM integrations
❌ No API access
❌ No 24/7 availability
❌ No team member access

---

## Database Schema

### Key Tables

#### 1. `tenants` Table (Extended)
Tracks subscription and trial status for each tenant.

```sql
-- Subscription Status
subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
subscription_plan: 'trial' | 'starter' | 'growth' | 'business'

-- Trial Tracking
trial_start_date: TIMESTAMP
trial_end_date: TIMESTAMP (trial_start_date + 14 days)
trial_minutes_allowed: INTEGER (50)
trial_minutes_used: INTEGER

-- Paid Plan Tracking
plan_minutes_allowed: INTEGER
plan_minutes_used: INTEGER
plan_minutes_reset_date: TIMESTAMP

-- Features (JSONB)
features: {
  "max_agents": 1,
  "max_phone_numbers": 1,
  "custom_voice_cloning": false,
  "advanced_analytics": false,
  "crm_integration": false,
  "api_access": false,
  "priority_support": false,
  "availability_24_7": false,
  "team_members_allowed": 1,
  "voice_options": 3
}
```

#### 2. `subscriptions` Table
Detailed subscription history.

#### 3. `usage_tracking` Table
Tracks every call's minute usage.

#### 4. `trial_events` Table
Tracks trial lifecycle events for analytics.

---

## Automatic Triggers

### 1. Initialize Trial on Signup
When a new tenant is created, the system automatically:
- Sets `subscription_status` to `'trial'`
- Sets `trial_start_date` to current timestamp
- Sets `trial_end_date` to 14 days from now
- Allocates 50 minutes (`trial_minutes_allowed`)
- Configures trial features

```sql
TRIGGER: initialize_trial_on_tenant_create
```

### 2. Track Call Usage
After each completed call:
- Calculates minutes used (duration in seconds / 60)
- Updates `trial_minutes_used` or `plan_minutes_used`
- Creates entry in `usage_tracking` table

```sql
TRIGGER: track_usage_on_call
```

### 3. Check Trial Expiration
Scheduled job to expire trials:
```sql
FUNCTION: check_trial_expiration()
```

---

## Trial Lifecycle

### Day 0: Signup
1. User signs up (no credit card)
2. Tenant created with trial initialized
3. Trial event: `trial_started`
4. Welcome email sent

### Day 1-13: Active Trial
- User can make calls (up to 50 minutes total)
- Business hours only (9 AM - 6 PM)
- Full access to trial features
- Usage tracked in real-time

### Day 7: Mid-Trial Reminder
- Email: "You've used X minutes, Y calls handled"
- Trial event: `reminder_sent_day_7`
- Show upgrade benefits

### Day 12: Upgrade Prompt
- Email: "Trial ends in 2 days"
- Trial event: `reminder_sent_day_12`
- Special offer: 20% off first 3 months

### Day 14: Trial Ends
- Email: "Trial ends today"
- Trial event: `reminder_sent_day_14`
- Final chance to upgrade

### Post-Trial: Grace Period
- 3-day grace period to upgrade
- Configuration saved for 30 days
- Trial event: `trial_expired`

### Conversion
When user upgrades:
- `subscription_status` → `'active'`
- `subscription_plan` → chosen plan
- `converted_from_trial` → `true`
- `conversion_date` → current timestamp
- Trial event: `trial_converted`
- Plan features activated

---

## Usage Checking

### SQL Function: `get_tenant_usage()`
Returns comprehensive usage stats:

```sql
SELECT * FROM get_tenant_usage('tenant-uuid-here');
```

Returns:
- `subscription_status`
- `is_trial`
- `trial_days_remaining`
- `trial_minutes_remaining`
- `plan_minutes_remaining`
- `can_make_calls`

---

## API Integration Points

### 1. Check Before Call
Before allowing a call, check:
```sql
SELECT can_make_calls FROM get_tenant_usage(tenant_id);
```

### 2. Display Usage in Dashboard
```sql
SELECT
  trial_minutes_used,
  trial_minutes_allowed,
  trial_days_remaining
FROM get_tenant_usage(tenant_id);
```

### 3. Upgrade Flow
When user clicks "Upgrade":
1. Show plan comparison
2. Collect payment (Stripe)
3. Update subscription:
```sql
UPDATE tenants
SET
  subscription_status = 'active',
  subscription_plan = 'starter', -- or growth/business
  subscription_start_date = NOW(),
  plan_minutes_allowed = 200, -- based on plan
  plan_minutes_used = 0,
  converted_from_trial = true,
  conversion_date = NOW(),
  features = {plan_features}
WHERE id = tenant_id;
```

---

## Conversion Strategy

### Email Sequence
1. **Day 0:** Welcome + Quick Start Guide
2. **Day 3:** Check-in - "Need help setting up?"
3. **Day 7:** Usage stats - "You've handled X calls"
4. **Day 10:** Feature highlight - "Upgrade for 24/7"
5. **Day 12:** Special offer - "20% off first 3 months"
6. **Day 14:** Final reminder - "Trial ends today"

### In-App Prompts
- Usage warning at 80% (40 minutes)
- Trial expiration warning (3 days before)
- Feature upgrade prompts (when trying restricted features)

---

## Analytics & Metrics

### Key Metrics to Track
1. **Trial Signup Rate**
   - Visitors → Trial signups

2. **Trial Activation Rate**
   - Signups → Made at least 1 call

3. **Trial-to-Paid Conversion Rate**
   - Trials → Paid subscriptions

4. **Time to First Call**
   - Signup → First call

5. **Average Minutes Used**
   - Average trial_minutes_used per trial

6. **Conversion by Usage**
   - Conversion rate by minute buckets (0-10, 11-25, 26-40, 41-50)

### SQL Queries

**Trial Conversion Rate:**
```sql
SELECT
  COUNT(CASE WHEN converted_from_trial = true THEN 1 END)::FLOAT /
  COUNT(*)::FLOAT * 100 as conversion_rate
FROM tenants
WHERE trial_start_date IS NOT NULL;
```

**Average Usage:**
```sql
SELECT
  AVG(trial_minutes_used) as avg_minutes,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY trial_minutes_used) as median_minutes
FROM tenants
WHERE subscription_status IN ('trial', 'expired');
```

---

## Plan Comparison

| Feature | Free Trial | Starter | Growth | Business |
|---------|-----------|---------|--------|----------|
| Duration | 14 days | Monthly | Monthly | Monthly |
| Price | $0 | $49/mo | $149/mo | $349/mo |
| Minutes | 50 | 200 | 750 | Unlimited |
| Agents | 1 | 1 | 3 | Unlimited |
| Voice Cloning | ❌ | ❌ | ✅ | ✅ |
| 24/7 Availability | ❌ | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| CRM Integration | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

---

## Implementation Checklist

### Database ✅
- [x] Migration created (004_free_trial_system.sql)
- [x] Triggers configured
- [x] Usage tracking function
- [ ] Run migration on production

### Landing Page ✅
- [x] Hero CTA updated ("Start 14-Day Free Trial")
- [x] Pricing section highlights trial
- [x] Free trial feature box added
- [x] "No credit card required" messaging

### Backend (TODO)
- [ ] Signup flow (no credit card)
- [ ] Usage checking middleware
- [ ] Trial expiration cron job
- [ ] Email sequences (Resend/SendGrid)
- [ ] Stripe integration for upgrades
- [ ] Dashboard usage display

### Frontend (TODO)
- [ ] Trial status banner in dashboard
- [ ] Usage meter component
- [ ] Upgrade flow modal
- [ ] Plan comparison page

---

## Testing Checklist

- [ ] Create trial account
- [ ] Make test call (verify usage tracking)
- [ ] Check usage display
- [ ] Test minute limit (50 minutes)
- [ ] Test trial expiration (manually set end date)
- [ ] Test upgrade flow
- [ ] Test feature restrictions
- [ ] Verify email triggers

---

## Support & FAQs

**Q: What happens after my trial ends?**
A: You have a 3-day grace period to upgrade. Your configuration is saved for 30 days.

**Q: Will I be charged automatically?**
A: No! We don't collect credit cards during trial. You must manually upgrade.

**Q: Can I upgrade before my trial ends?**
A: Yes! You can upgrade anytime and unused trial minutes carry over.

**Q: What happens to my data if I don't upgrade?**
A: Your data is saved for 30 days. After that, it's permanently deleted.

---

## Next Steps

1. **Run the migration:**
   ```bash
   supabase db push
   ```

2. **Test locally:**
   - Create test account
   - Make test calls
   - Verify usage tracking

3. **Implement backend logic:**
   - Usage checking before calls
   - Trial expiration job
   - Email automation

4. **Add to dashboard:**
   - Usage meter
   - Upgrade prompts
   - Plan comparison

5. **Launch & Monitor:**
   - Track conversion metrics
   - A/B test messaging
   - Optimize trial length/minutes based on data
