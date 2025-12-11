# HealthPal - Consultations & Video/Audio Calls

## Overview

The consultation system is the core of HealthPal, enabling patients to book appointments with doctors and conduct video/audio calls or chat-based consultations.

## Consultation States (Lifecycle)

```
pending → accepted → completed
```

1. **pending**: Patient has booked, waiting for doctor acceptance
2. **accepted**: Doctor has accepted the consultation, patient can now initiate calls
3. **completed**: Call has ended or consultation period is over

## Consultation Modes

HealthPal supports three consultation modes:

| Mode | Description | Features |
|------|-------------|----------|
| **chat** | Text-based messaging | Real-time messages, message history, independent from calls |
| **audio** | Voice call | Call history, duration tracking, auto-end previous calls |
| **video** | Video call | Call history, duration tracking, auto-end previous calls |

### Key Rules

1. **Doctor Acceptance Required**: Patients cannot start calls until the doctor accepts
2. **Only One Active Call**: When starting a new call, previous active calls are automatically ended
3. **Chat is Independent**: Chat mode consultations are completely separate from video/audio calls
4. **Auto-End Previous**: Starting a new call automatically ends all active calls for that consultation

## Booking a Consultation

### Patient Flow

```
1. Select Doctor
2. Choose Date & Time
3. Select Mode (chat/audio/video)
4. Add Notes (optional)
5. Submit Booking
6. Status: "pending" - Wait for doctor acceptance
```

**API Endpoint**: `POST /consultations`

```json
{
  "doctor_id": 1,
  "consultation_date": "2025-12-12 12:00",
  "mode": "video",
  "notes": "Please discuss my symptoms"
}
```

**Response**:
```json
{
  "message": "Consultation booked successfully",
  "consultationId": 6
}
```

## Doctor Acceptance

### Doctor Actions

Once a consultation is booked, doctors can:

1. **View Pending Consultations** - List all consultations waiting for acceptance
2. **Accept Consultation** - Change status from "pending" to "accepted"

**API Endpoint**: `PATCH /consultations/{id}/status`

```json
{
  "status": "accepted"
}
```

### View Doctor Consultations

**API Endpoint**: `GET /consultations`

**Doctor sees:**
- All consultations assigned to them
- Filtered by `doctor_id = current_user.id`
- Shows actual status: pending/accepted/completed

**Patient sees:**
- All consultations they booked
- Filtered by `patient_id = current_user.id`
- Shows actual status: pending/accepted/completed

## Video Calls

### Starting a Video Call

**Requirements:**
- Consultation mode must be "video"
- Consultation status must be "accepted" or "completed"
- Previous active calls will be automatically ended

**Patient API**: `POST /consultations/{id}/video-calls`

```json
{}
```

**Response**:
```json
{
  "message": "Video call started",
  "callId": 8,
  "consultationId": 2
}
```

### Call Status Tracking

**Get Active Calls**: `GET /consultations/{id}/video-calls`

```json
[
  {
    "id": 8,
    "status": "active",
    "started_at": "2025-12-07T19:09:16Z",
    "duration_seconds": null
  }
]
```

### Ending a Video Call

**API Endpoint**: `PATCH /consultations/{id}/video-calls/end`

```json
{
  "callId": 8,
  "duration_seconds": 600
}
```

**Response**:
```json
{
  "message": "Video call ended successfully"
}
```

**After End:**
- Call status → "completed"
- Consultation status → "completed"
- Duration is recorded for history

## Audio Calls

Audio calls follow the same pattern as video calls:

### Starting Audio Call

**API**: `POST /consultations/{id}/audio-calls`

### Get Audio Calls

**API**: `GET /consultations/{id}/audio-calls`

### End Audio Call

**API**: `PATCH /consultations/{id}/audio-calls/end`

## Call History

### View Call History

**Endpoint**: `GET /consultations/{id}/video-calls` or `GET /consultations/{id}/audio-calls`

**Response**:
```json
[
  {
    "id": 8,
    "status": "completed",
    "started_at": "2025-12-07T19:09:16Z",
    "ended_at": "2025-12-07T19:19:16Z",
    "duration_seconds": 600,
    "initiator_name": "anwar baker"
  }
]
```

### Duration Calculation

Duration is calculated in three ways (in order of priority):

1. **Stored Duration**: If `duration_seconds` is saved in database
2. **Timestamp Calculation**: If `started_at` and `ended_at` exist
3. **Default**: "0m 0s" if no data available

**Format Examples:**
- "20m 10s" (under 1 hour)
- "1h 20m 15s" (1 hour or more)

## Chat Messages (Independent)

Chat mode consultations have their own messaging system completely separate from video/audio calls.

### Send Message

**API**: `POST /consultations/{id}/messages`

```json
{
  "message_text": "Hello doctor, I have some questions"
}
```

### View Messages

**API**: `GET /consultations/{id}/messages`

**Response**:
```json
[
  {
    "id": 1,
    "sender_id": 1,
    "message_text": "Hello doctor",
    "sent_at": "2025-12-07T19:00:00Z"
  }
]
```

### Key Rules for Chat

- Only available for consultations with `mode = "chat"`
- Messages are not shown in video/audio call management
- Independent from call history
- Real-time messaging capability

## CLI Features

### Patient Commands

```bash
# View all consultations
> View consultations

# Book new consultation
> Book consultation
  Select doctor → Choose date/time → Select mode → Add notes

# Manage calls
> Manage calls (video/audio)
  View active calls → Start new call → End call

# Send messages (chat only)
> Messaging → Send message / View messages
```

### Doctor Commands

```bash
# View assigned consultations
> View consultations

# Accept pending consultations
> Accept consultation
  Select from pending list → Confirm acceptance

# Start calls with patients
> Calls → Start video call / Start audio call
```

## Common Scenarios

### Scenario 1: Patient Initiates Call, Then Doctor Joins

```
1. Patient books video consultation → Status: pending
2. Doctor accepts → Status: accepted
3. Patient starts call → Call ID: 8, Status: active
4. Doctor can see active call
5. Either party ends call → Status: completed
```

### Scenario 2: Multiple Calls on Same Consultation

```
1. Patient starts Call #1 → active
2. Patient wants to restart
3. System auto-ends Call #1
4. Patient starts Call #2 → active (only 1 active at a time)
```

### Scenario 3: Doctor Acceptance Workflow

```
Doctor View shows: ID 2, Status: pending
Patient View shows: ID 2, Status: pending

[Doctor accepts]

Doctor View shows: ID 2, Status: accepted
Patient View shows: ID 2, Status: accepted

[Patient can now start calls]
```

## Data Isolation

### Security Rules

- **Patients** can only see/manage their own consultations (filtered by `patient_id`)
- **Doctors** can only see/manage consultations assigned to them (filtered by `doctor_id`)
- **Other doctors** cannot see consultations with different doctors
- Enforced at API level with SQL WHERE clauses

**Example:**
```sql
-- Patient view
WHERE c.patient_id = ?

-- Doctor view
WHERE c.doctor_id = ?
```

## Database Tables

### Main Tables

```
consultations
├── id
├── patient_id → references users.id
├── doctor_id → references users.id
├── consultation_date
├── mode: "chat" | "audio" | "video"
├── status: "pending" | "accepted" | "completed"
├── notes
└── created_at, updated_at

video_calls
├── id
├── consultation_id → references consultations.id
├── initiator_id → references users.id
├── status: "active" | "completed"
├── started_at
├── ended_at
├── duration_seconds
└── created_at

audio_calls
├── id
├── consultation_id → references consultations.id
├── initiator_id → references users.id
├── status: "active" | "completed"
├── started_at
├── ended_at
├── duration_seconds
└── created_at

messages
├── id
├── consultation_id → references consultations.id
├── sender_id → references users.id
├── message_text
├── sent_at
└── created_at
```

## Status Display Logic

The system uses **actual stored status** for workflow decisions:

- **Database Status**: What's actually stored (pending/accepted/completed)
- **Display Purpose**: Shows real consultation state
- **Workflow Control**: Determines available actions

### Why This Matters

If a consultation's actual stored status is "accepted", the patient CAN manage calls, regardless of the consultation date being in the past or future.

## Best Practices

1. **Always wait for doctor acceptance** before attempting to start calls
2. **Check consultation status** before starting a new call
3. **Use call history** to track previous interactions
4. **Separate chat from calls** - don't mix messaging with call management
5. **Auto-end handling** - starting a new call automatically cleans up old ones
6. **Doctor view accuracy** - doctors always see actual pending consultations

## Troubleshooting

### Issue: Can't start call on accepted consultation

**Causes:**
1. Consultation mode is "chat" (chat doesn't have calls)
2. Consultation status is actually "pending" (not accepted)
3. Wrong consultation type selected

**Solution:**
- Verify `mode = "video"` or `mode = "audio"`
- Confirm doctor has accepted (status = "accepted")
- Refresh consultation list to see latest status

### Issue: Call status changed to pending after starting

**Cause**: Previous versions set status to "in-progress" (invalid status)

**Solution**: Consultation status now stays "accepted" during active calls, only changes to "completed" when call ends

### Issue: Can't see pending consultations (doctor)

**Cause:** Only consultations with stored status = "pending" are shown

**Solution:**
- Check filter in accept consultation menu
- Refresh the list
- Verify consultations aren't already accepted

## Related Documentation

- [Messaging System](./WIKI_MESSAGING.md)
- [API Endpoints](./WIKI_API_ENDPOINTS.md)
- [CLI Guide](./WIKI_CLI.md)
- [Database Schema](./WIKI_DATABASE.md)
