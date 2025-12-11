# HealthPal - CLI Guide (Interactive Command-Line Interface)

## Overview

The HealthPal CLI is an interactive command-line tool for testing the entire platform without using API tools like Postman. Perfect for development, testing, and demonstrations.

## Starting the CLI

```bash
npm run cli
```

Expected output:
```
===== HealthPal CLI =====
Not logged in
------------------------
1) Login
2) Register
0) Exit
> 
```

## Authentication

### Register New Account

```
Menu: Not logged in
> 2

--- Registration ---
Email: patient@example.com
Full Name: John Doe
Password: Password123!
Confirm Password: Password123!
Phone: +1234567890

Select Role:
1) Patient
2) Doctor
3) Donor
4) NGO
> 1

✓ Registration successful!
```

### Login

```
Menu: Not logged in
> 1

--- Login ---
Email: doctor@example.com
Password: Doctor123!

✓ Welcome, Doctor Name! (doctor)
```

### Logout

```
Menu: Logged in
> Logout
✓ Logged out
```

## Patient Features

### Main Menu (Patient)

```
===== HealthPal CLI =====
Logged in as: John Doe (patient)
------------------------
1) Profile
2) Consultations
3) Messaging
4) Health & Medicine
5) Sponsorships
6) Mental Health
7) Support & Resources
8) Translation Services
9) Disease Outbreaks
10) Alerts
11) View NGOs
12) Logout
0) Exit
```

### 1. Profile Management

**View Profile:**
```
> 1

--- Profile ---
✓ Username: John Doe
✓ Email: john@example.com
✓ Age: 28
✓ Blood Type: O+
✓ Medical History: Hypertension
```

**Edit Profile:**
```
Enter your new age (or press Enter to skip): 30
Enter your blood type: O+
Enter medical history: Hypertension, Controlled
✓ Profile updated
```

### 2. Consultations

#### List Doctors

```
> 2
> 1

--- Available Doctors ---
1) Dr. Ahmad Dardouk - Brain Surgeon ($40.00/session)
2) Dr. Amr - Mental Health ($72.00/session)
3) Dr. Sarah - General Medicine ($30.00/session)

Select doctor: 1
```

#### Book Consultation

```
> 2

--- Available Doctors ---
[Select doctor from list]

Date & time (YYYY-MM-DD HH:MM): 2025-12-12 14:00

--- Consultation Mode ---
1) Chat
2) Audio Call
3) Video Call
Select mode (1-3): 3

Notes (optional): Please discuss my symptoms

✓ Consultation booked. ID: 6
  Mode: VIDEO
  Please wait for the doctor to accept your consultation request
```

**Consultation Statuses:**
- `pending` - Waiting for doctor acceptance
- `accepted` - Doctor accepted, can start calls
- `completed` - Call has ended

#### View Consultations

```
> 3

--- Your Consultations ---
┌─────────┬────┬─────────────────┬───────────────────────────┬─────────┬─────────────┐
│ (index) │ ID │ Doctor          │ Date                      │ Mode    │ Status      │
├─────────┼────┼─────────────────┼───────────────────────────┼─────────┼─────────────┤
│ 0       │ 2  │ 'Ahmad Dardouk' │ '12/12/2026, 12:00:00 AM' │ 'video' │ 'accepted'  │
│ 1       │ 5  │ 'Ahmad Dardouk' │ '01/07/2026, 12:00:00 AM' │ 'chat'  │ 'pending'   │
└─────────┴────┴─────────────────┴───────────────────────────┴─────────┴─────────────┘
```

#### Manage Calls (Video/Audio)

```
> 4

--- Video/Audio Consultations ---
1) Ahmad Dardouk - VIDEO - 12/12/2026 [accepted]
2) Ahmad Dardouk - CHAT - 01/07/2026 [pending]

Select consultation (1-2): 1

--- Call Management ---
1) View active calls
2) Start new call
3) End call
0) Back

> 2
⏹ Ending 1 active call(s)...
✓ Video call started
  Call ID: 8
  📹 [Video call interface would open here in a real application]
```

**Call Management Options:**

1. **View Active Calls** - See call history and status
2. **Start New Call** - Initiates video/audio call (auto-ends previous calls)
3. **End Call** - Terminates active call

### 3. Messaging (Chat Mode Only)

```
> 3

--- CONSULTATIONS ---
1) Send message
2) View messages
0) Back

> 1

--- Chat Consultations ---
1) Ahmad Dardouk - 01/07/2026
2) Sarah Johnson - 12/15/2025

Select consultation (1-2): 1

Message: Hello doctor, I have questions about my treatment

✓ Message sent successfully
```

**View Messages:**
```
> 2

[Select consultation from list]

--- Messages ---
1) Doctor: These are your test results...
2) You: Thank you, what should I do next?
3) Doctor: Follow these recommendations...
```

### 4. Health & Medicine

**Request Medicine:**
```
> 4

--- Medicine Request ---
Medicine name: Aspirin
Quantity: 30
Urgency (1=low, 2=medium, 3=high): 2

✓ Medicine request submitted
```

**View Requests:**
```
Your medicine requests
1) Aspirin - 30 units - Status: pending
2) Insulin - 5 units - Status: fulfilled
```

### 5. Sponsorships

**Create Campaign:**
```
> 5

--- Create Sponsorship Campaign ---
Treatment type: Heart Surgery
Goal amount: 50000
Description: Need help funding emergency heart surgery

✓ Campaign created
Campaign ID: 12
```

**View Campaigns:**
```
Your sponsorship campaigns
1) Heart Surgery - $25,000 of $50,000 raised
2) Cancer Treatment - $10,000 of $100,000 raised
```

### 6. Mental Health

**Book Therapy:**
```
> 6

--- Mental Health Services ---
[Select available therapists]

Choose date and time for therapy session
✓ Therapy session booked
```

### 7. Translation Services

```
> 8

--- Translation ---
Text to translate: Hello doctor
Language (e.g., es, ar, fr): ar

Translation: مرحبا بالطبيب
```

### 8. Disease Outbreaks

```
> 9

--- Disease Outbreaks ---
COVID-19 Statistics:
- Cases: 770,000,000
- Deaths: 6,950,000
- Recoveries: 761,000,000
```

### 9. View NGOs

```
> 11

--- NGO List ---
1) Green Party - Medical Missions
2) Red Crescent - Humanitarian Aid
3) Save Lives - Emergency Response
```

## Doctor Features

### Main Menu (Doctor)

```
===== HealthPal CLI =====
Logged in as: Dr. Ahmad (doctor)
------------------------
1) Profile
2) Consultations
3) Calls
4) Messaging
5) Content & Support
6) Alerts
7) Logout
0) Exit
```

### 1. View Consultations

```
> 2
> 1

--- Your Consultations (Doctor View) ---
┌─────────┬────┬───────────────┬───────────────────────────┬─────────┬─────────────┐
│ (index) │ ID │ Patient       │ Date                      │ Mode    │ Status      │
├─────────┼────┼───────────────┼───────────────────────────┼─────────┼─────────────┤
│ 0       │ 2  │ 'John Doe'    │ '12/12/2026, 12:00:00 AM' │ 'video' │ 'pending'   │
│ 1       │ 5  │ 'Jane Smith'  │ '01/07/2026, 12:00:00 AM' │ 'chat'  │ 'pending'   │
└─────────┴────┴───────────────┴───────────────────────────┴─────────┴─────────────┘
```

### 2. Accept Consultations

```
> 2
> 2

--- Pending Consultations ---
1) John Doe - 12/12/2026 (video)
2) Jane Smith - 01/07/2026 (chat)

Select consultation (1-2): 1

✓ Consultation accepted
```

After acceptance, patient can start calls.

### 3. Manage Calls

**Start Video Call:**
```
> 3
> 1

--- Video Consultations (Pending/Accepted) ---
1) John Doe - 12/12/2026 (accepted)

Select consultation (1-1): 1

✓ Video call started with John Doe
📹 Call ID: 8
```

**Start Audio Call:**
```
> 2

--- Audio Consultations (Pending/Accepted) ---
[Select from list]

✓ Audio call started
🎙 Call ID: 5
```

### 4. View Call History

```
> 3

--- Call Management ---
1) View video calls
2) View audio calls
3) Start new call
4) End call
0) Back

> 1

--- Video Call History ---
┌─────────┬────┬──────────┬───────────────────────────┬──────────────┐
│ (index) │ ID │ Status   │ StartedAt                 │ Duration     │
├─────────┼────┼──────────┼───────────────────────────┼──────────────┤
│ 0       │ 8  │ 'active' │ '12/07/2025, 07:00:46 PM' │ 'Ongoing'    │
│ 1       │ 7  │ 'complete' │ '12/06/2025, 10:52:19 PM' │ '25m 30s'    │
└─────────┴────┴──────────┴───────────────────────────┴──────────────┘
```

### 5. Message Patients

```
> 4

--- Chat Consultations ---
1) John Doe - 01/07/2026
2) Jane Smith - 12/15/2025

Select consultation: 1

Message: Your test results are ready

✓ Message sent
```

## NGO Features

### Main Menu (NGO)

```
===== HealthPal CLI =====
Logged in as: Green Party (ngo)
------------------------
1) Profile
2) Missions
3) Messaging
4) Reports
5) Volunteers
6) Logout
0) Exit
```

### 1. View Missions

```
> 2
> 1

--- NGO Missions ---
┌─────────┬────┬─────────────┬──────────┬───────────────────────────┬──────────────┐
│ (index) │ ID │ Title       │ Location │ Date                      │ DoctorNeeded │
├─────────┼────┼─────────────┼──────────┼───────────────────────────┼──────────────┤
│ 0       │ 5  │ 'volunteer' │ 'jenin'  │ '11/15/2025, 02:30:00 PM' │ 'Yes'        │
│ 1       │ 6  │ 'medical'   │ 'gaza'   │ '08/31/2025, 09:00:00 PM' │ 'No'         │
└─────────┴────┴─────────────┴──────────┴───────────────────────────┴──────────────┘
```

### 2. Create Mission

```
> 2

--- Create Mission ---
Mission type (1=medical, 2=supply, 3=volunteer): 1
Location: Gaza City
Date & time (YYYY-MM-DD HH:MM): 2025-12-15 09:00
Doctor needed (y/n): y
Description: Medical clinic in Gaza

✓ Mission created. ID: 7
```

### 3. Update Mission

```
> 3

--- Update Mission ---
[Select mission from list]

Mission type (press Enter to skip): 
Location (press Enter to skip): Ramallah
Status (press Enter to skip): in-progress

✓ Mission updated
```

## Common Workflows

### Workflow 1: Complete Consultation (Patient → Doctor)

```
PATIENT:
1. Login
2. Book consultation (Mode: Video, Status: pending)
3. Wait for doctor acceptance

DOCTOR:
1. Login
2. View consultations (see patient's booking)
3. Accept consultation (Status: accepted)

PATIENT:
1. View consultations (Status now: accepted)
2. Manage calls → Start new call

DOCTOR:
1. Calls → Start video call
2. [Call active]

PATIENT/DOCTOR:
1. Manage/Calls → End call
2. [Status: completed]
```

### Workflow 2: Chat Message Exchange

```
PATIENT:
1. Book consultation (Mode: Chat)
2. Messaging → Send message → "Hello doctor"

DOCTOR:
1. Accept consultation
2. Messaging → View messages
3. Messaging → Send message → "Hello patient, how can I help?"

PATIENT:
1. Messaging → View messages
2. See doctor's reply
```

### Workflow 3: NGO Medical Mission

```
NGO:
1. Create mission (Type: medical, Location: Gaza)
2. Update mission (add volunteers, track progress)

DOCTOR:
1. View NGO missions
2. Join as volunteer

PATIENT:
1. View available NGO missions
2. Register for support
```

## Navigation Tips

### Going Back

- Press `0` to go back one level
- Keep pressing `0` to return to main menu
- Type `exit` or `quit` to exit completely

### Input Validation

```
Select option (1-3): 5
✗ Invalid selection

Select option (1-3): 2
[Proceeds to option 2]
```

### Error Handling

```
[If consultation doesn't exist]
✗ Consultation not found

[If status prevents action]
✗ Cannot manage calls - consultation status is "pending"

[If network error]
✗ Error: Failed to fetch consultations
```

## Troubleshooting

### Issue: "Login required"
**Solution**: Register and login first

### Issue: Can't start call
**Reasons:**
1. Consultation status is "pending" (needs doctor acceptance)
2. Consultation mode is "chat" (chat doesn't have calls)
3. Not the consultation owner

### Issue: Messages from wrong consultation
**Cause**: Chat messages are tied to specific consultations
**Solution**: Select correct consultation before viewing

### Issue: Consultation shows as "pending" after doctor accepted
**Cause**: Data not refreshed
**Solution**: Go back and reselect consultations

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Exit CLI |
| `Enter` | Skip optional field |
| `0` | Go back to previous menu |
| `type exit` | Exit to OS |

## Testing Checklist

Use this CLI to test:

- [ ] User registration and login
- [ ] Doctor and patient role selection
- [ ] Consultation booking
- [ ] Doctor acceptance workflow
- [ ] Video call initiation
- [ ] Audio call management
- [ ] Chat messaging
- [ ] NGO missions
- [ ] Sponsorship creation
- [ ] Error messages
- [ ] Data validation

## Performance Notes

- All operations are instantaneous (no real calls)
- Messages show placeholders for actual video/audio
- Data is persisted to backend database
- Each session maintains separate state

## For Development

The CLI is great for:
- ✅ Testing API endpoints
- ✅ Verifying data persistence
- ✅ Checking role-based access
- ✅ Validating workflows
- ✅ Demonstrating features
- ✅ Quick debugging

For production testing, use:
- Postman/Insomnia for detailed API testing
- Swagger UI for interactive docs
- Jest for automated testing

---

**Last Updated**: December 11, 2025  
**CLI Version**: 1.0.0
