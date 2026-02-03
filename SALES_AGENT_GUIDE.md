# Sales Agent (Outbound) - Complete Setup Guide

## Overview
The Sales Agent is a specialized outbound calling AI that presents Pillow AI to businesses, qualifies leads, and demonstrates the product's capabilities during the call itself.

---

## What Makes This Agent Special

### 1. **Outbound Calling**
- Unlike other agents that answer calls, this one MAKES calls
- Presents Pillow AI service to potential customers
- Acts as both sales rep AND live product demo

### 2. **The "Reveal" Strategy**
- Starts conversation naturally as a human sales rep
- Builds rapport and identifies pain points
- **Mid-conversation reveal**: "I'm actually an AI - the product I'm selling to you!"
- This creates a "wow moment" that demonstrates the technology live

### 3. **Google Sheets Integration**
**Input Sheet** (Your Prospect List):
- Business Name
- Phone Number
- Industry (optional)
- Contact Person (optional)
- Notes/Description (optional)

**Output Sheet** (Auto-Created Call Log):
- Business Name
- Phone Number
- Contact Person
- Call Date & Time
- Call Duration
- Outcome (Interested, Not Interested, Callback, Voicemail, No Answer, etc.)
- Interest Level (Hot, Warm, Cold)
- Pain Points Identified
- Objections Raised
- Next Action
- Follow-up Date
- Notes
- Email Address (if collected)

### 4. **Intelligent Call Tracking**
Tracks every call with detailed outcomes:
- ✅ Interested - wants demo/follow-up
- ❌ Not Interested - no future contact
- 📅 Callback Requested - specific date/time
- 📧 Sent Information - awaiting response
- 📞 Voicemail - left message
- ⚠️ No Answer - try again later
- 🚫 Do Not Call - explicit request

---

## How It Works

### Call Flow:

```
1. INTRODUCTION (30s)
   ↓
   Natural greeting, build rapport

2. DISCOVERY (60s)
   ↓
   Ask qualifying questions
   Identify pain points

3. THE REVEAL (30s)
   ↓
   "I'm actually an AI..."
   Live demonstration

4. HANDLE RESPONSE (2-5min)
   ↓
   If interested → Book next steps
   If skeptical → Address concerns
   If not interested → End gracefully

5. LOG & SCHEDULE (5s)
   ↓
   Log call outcome to Google Sheets
   Schedule follow-up if needed
```

---

## Configuration Options

### During Agent Creation:

#### 1. **Google Sheets Setup**
- [ ] Connect Google Account (OAuth)
- [ ] Select Input Sheet (prospect list)
- [ ] Map columns (which column has phone numbers, business names, etc.)
- [ ] Output sheet will be auto-created: `[Agent Name] - Call Log`

#### 2. **Calling Schedule** (Optional - can set later)
- **Immediate**: Start calling now
- **Daily**: Specific time each day (e.g., 10 AM - 4 PM)
- **Weekly**: Specific days (e.g., Mon-Fri, 9 AM - 5 PM)
- **Custom**: Specific dates/times
- **Manual Only**: Don't auto-dial, just track when calls are made

#### 3. **Call Settings**
- **Time Zone**: Your business timezone
- **Call Hours**: Restrict calling to business hours (e.g., 9 AM - 6 PM)
- **Max Calls Per Day**: Limit (e.g., 50 calls/day)
- **Do Not Call Days**: Weekends, holidays
- **Retry Logic**:
  * No Answer: Retry 2 more times at different times
  * Voicemail: Retry in 2-3 business days
  * Busy: Retry in 1 hour

#### 4. **Follow-up Rules**
- **Interested Leads**: Schedule human callback within 24 hours
- **Sent Info**: Follow up in 3-5 business days
- **Callback Requested**: Honor exact date/time
- **Not Interested**: Mark as closed, no further contact

---

## Input Sheet Format

Create a Google Sheet with these columns:

| Business Name | Phone Number | Industry | Contact Person | Description | Status |
|--------------|--------------|----------|----------------|-------------|--------|
| ABC Dental | +1-555-0101 | Healthcare | Dr. Smith | Small dental practice | New |
| XYZ Salon | +1-555-0102 | Beauty | Maria | Hair salon, 3 locations | New |

**Column Definitions:**
- **Business Name** (Required): Name of business to call
- **Phone Number** (Required): Format: +1-555-1234 or (555) 123-4567
- **Industry** (Optional): Helps personalize pitch
- **Contact Person** (Optional): Who to ask for
- **Description** (Optional): Notes about the business
- **Status** (Auto-updated): New → Called → Interested/Not Interested

---

## Output Sheet Auto-Generated

The agent creates a detailed call log:

| Timestamp | Business | Phone | Contact | Duration | Outcome | Interest | Pain Points | Next Action | Follow-up |
|-----------|----------|-------|---------|----------|---------|----------|-------------|-------------|-----------|
| 2026-02-02 10:15 | ABC Dental | +1-555-0101 | Dr. Smith | 4m 32s | Interested | Hot | Missed calls, after-hours | Human callback | 2026-02-03 |
| 2026-02-02 10:20 | XYZ Salon | +1-555-0102 | Maria | 2m 15s | Sent Info | Warm | Time on phone calls | Email sent | 2026-02-07 |

---

## UI Design for Configuration

### Step 1: Template Selection
Standard template grid (already implemented)

### Step 2: Google Sheets Connection
```
┌─────────────────────────────────────────┐
│  Connect Google Sheets                   │
│                                          │
│  [Button] Connect Google Account         │
│                                          │
│  Once connected:                         │
│  ┌────────────────────────────────────┐ │
│  │ Select Prospect List Sheet:        │ │
│  │ [Dropdown] My Sales Prospects 2026 ▼│ │
│  └────────────────────────────────────┘ │
│                                          │
│  Map Columns:                            │
│  Business Name: Column A ▼               │
│  Phone Number:  Column B ▼               │
│  Industry:      Column C ▼               │
│  Contact:       Column D ▼               │
│                                          │
│  Output Log Sheet Name:                  │
│  [Input] Sales Agent - Call Log          │
│  (Auto-created on first call)            │
└─────────────────────────────────────────┘
```

### Step 3: Schedule Configuration
```
┌─────────────────────────────────────────┐
│  Calling Schedule                        │
│                                          │
│  When should this agent make calls?      │
│                                          │
│  ( ) Start immediately                   │
│  (•) Custom schedule                     │
│  ( ) Manual only (I'll trigger calls)    │
│                                          │
│  If custom schedule:                     │
│  ┌────────────────────────────────────┐ │
│  │ Days: [x] Mon [x] Tue [x] Wed      │ │
│  │       [x] Thu [x] Fri [ ] Sat      │ │
│  │       [ ] Sun                       │ │
│  │                                     │ │
│  │ Hours: From [9:00 AM] To [5:00 PM] │ │
│  │                                     │ │
│  │ Time Zone: [America/New_York ▼]    │ │
│  │                                     │ │
│  │ Max Calls Per Day: [50]            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Toggle] Skip Holidays                  │
│  [Toggle] Respect Do Not Call list       │
└─────────────────────────────────────────┘
```

### Step 4: Call Settings
```
┌─────────────────────────────────────────┐
│  Advanced Call Settings                  │
│                                          │
│  Retry Logic:                            │
│  No Answer:  [2] attempts, [4] hours apart│
│  Voicemail:  Retry in [3] business days   │
│  Busy:       Retry in [1] hour            │
│                                          │
│  Follow-up Automation:                   │
│  [x] Auto-schedule human rep callbacks   │
│  [x] Send email after "Sent Info" outcome│
│  [x] Smart follow-up timing              │
│                                          │
│  Rate Limiting:                          │
│  Min time between calls: [30] seconds    │
│  Max concurrent calls:   [1]             │
│                                          │
│  [Checkbox] I confirm I have permission  │
│              to call these businesses    │
└─────────────────────────────────────────┘
```

---

## Agent Behavior Details

### Call Handling Scenarios

#### 1. Person Answers - Interested
```
Agent: "Hi, is this ABC Dental? Great! My name is Jordan..."
[Discovery questions]
[Reveal: "I'm actually an AI..."]
Person: "Wow, that's impressive!"
Agent: "I'm glad you see the potential! Would you like to..."
[Logs outcome: Interested, schedules human callback]
```

#### 2. Person Answers - Not Interested
```
Agent: "Hi, is this XYZ Salon? My name is Jordan..."
Person: "Not interested, thanks."
Agent: "I totally understand. Thanks for your time!"
[Ends call respectfully]
[Logs outcome: Not Interested, adds to Do Not Call]
```

#### 3. Voicemail
```
Agent: "Hi, this is Jordan calling about Pillow AI, an innovative solution that helps businesses never miss customer calls. I'd love to share how it works. Please call us back at [number] or visit our website. Thanks!"
[Logs outcome: Voicemail]
[Schedules retry in 2-3 days]
```

#### 4. No Answer / Busy
```
[Logs outcome: No Answer]
[Schedules retry at different time]
[After 3 attempts, marks as unreachable]
```

---

## Webhook URLs Needed

You'll need to set up these endpoints:

### 1. `SALES_LOG_WEBHOOK`
**Purpose**: Log call outcomes to Google Sheets

**Payload**:
```json
{
  "business_name": "ABC Dental",
  "phone_number": "+1-555-0101",
  "contact_person": "Dr. Smith",
  "call_outcome": "interested",
  "call_duration": 272,
  "interest_level": "hot",
  "pain_points_identified": "Missing after-hours calls",
  "next_action": "Schedule human rep callback",
  "follow_up_date": "2026-02-03",
  "notes": "Very interested in 24/7 coverage"
}
```

### 2. `CALLBACK_SCHEDULER_WEBHOOK`
**Purpose**: Schedule follow-up calls

**Payload**:
```json
{
  "business_name": "ABC Dental",
  "phone_number": "+1-555-0101",
  "callback_type": "human_rep",
  "requested_datetime": "2026-02-03T14:00:00Z",
  "reason": "Interested in demo"
}
```

### 3. `EMAIL_SENDER_WEBHOOK`
**Purpose**: Send follow-up emails

**Payload**:
```json
{
  "recipient_email": "contact@abcdental.com",
  "recipient_name": "Dr. Smith",
  "business_name": "ABC Dental",
  "email_type": "intro",
  "custom_message": "As discussed, here's information about Pillow AI..."
}
```

---

## Google Sheets API Setup

### Prerequisites:
1. Google Cloud Project
2. Google Sheets API enabled
3. OAuth 2.0 credentials
4. Service Account (for writing to sheets)

### Required Scopes:
```
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive.file
```

### Environment Variables Needed:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=user-refresh-token
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

---

## Legal & Compliance

⚠️ **IMPORTANT**: This agent makes outbound sales calls. Ensure compliance with:

- **TCPA** (Telephone Consumer Protection Act)
- **Do Not Call Registry**
- **Local regulations** in your jurisdiction

### Best Practices:
- ✅ Only call businesses (B2B calling is generally permitted)
- ✅ Call during business hours (9 AM - 8 PM local time)
- ✅ Honor all "Do Not Call" requests immediately
- ✅ Maintain internal Do Not Call list
- ✅ Be transparent about being an AI
- ✅ Provide clear opt-out mechanism
- ✅ Keep detailed call logs

---

## What You Need to Provide

### 1. **Google Sheets Setup**
- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Create OAuth 2.0 credentials
- [ ] Get refresh token for user access
- [ ] Create service account for write access

### 2. **Webhook Endpoints**
- [ ] Deploy webhook for Google Sheets logging
- [ ] Deploy webhook for callback scheduling
- [ ] Deploy webhook for email sending

### 3. **Configuration**
- [ ] Prepare prospect list in Google Sheets
- [ ] Define calling schedule
- [ ] Set call hour restrictions
- [ ] Configure follow-up rules

### 4. **Integration Testing**
- [ ] Test call logging to Google Sheets
- [ ] Verify callback scheduling works
- [ ] Check email sending
- [ ] Test full call flow end-to-end

---

## Next Steps

1. **I've created the Sales Agent template** with the complete prompt and behavior
2. **You need to provide**: Google OAuth credentials and setup webhook endpoints
3. **I'll then build**: The UI configuration screens and Google Sheets integration
4. **Final step**: Test with real outbound calls

Would you like me to:
1. Create the webhook endpoints for Google Sheets integration?
2. Build the configuration UI screens?
3. Set up the Google OAuth flow?

Let me know what credentials/access you have ready, and I'll implement the next pieces!
