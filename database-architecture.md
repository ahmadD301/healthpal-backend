```mermaid
classDiagram

%% ============================
%% ======== USER SYSTEM ========
%% ============================

class User {
    +id: Int
    +full_name: String
    +email: String
    +password_hash: String
    +role: "patient" | "doctor" | "donor" | "ngo" | "admin"
    +phone: String
    +verified: Boolean
    +created_at: Date
    +updated_at: Date
}

class PatientProfile {
    +id: Int
    +user_id: Int
    +age: Int
    +gender: "male" | "female" | "other"
    +blood_type: String
    +medical_history: Text
    +location: String
}

class DoctorProfile {
    +id: Int
    +user_id: Int
    +specialty: String
    +license_no: String
    +experience_years: Int
    +consultation_fee: Decimal
    +available: Boolean
}

User "1" --> "1" PatientProfile : has >
User "1" --> "1" DoctorProfile : has >


%% ============================
%% ====== CONSULTATIONS ========
%% ============================

class Consultation {
    +id: Int
    +patient_id: Int
    +doctor_id: Int
    +consultation_date: DateTime
    +mode: "video" | "audio" | "chat"
    +status: String
    +notes: Text
}

class Message {
    +id: Int
    +consultation_id: Int
    +sender_id: Int
    +message_text: Text
    +sent_at: Date
}

class AudioMessage {
    +id: Int
    +consultation_id: Int
    +sender_id: Int
    +audio_url: String
    +duration_seconds: Int
    +sent_at: Date
}

class VideoMessage {
    +id: Int
    +consultation_id: Int
    +sender_id: Int
    +video_url: String
    +duration_seconds: Int
    +sent_at: Date
}

class AudioCall {
    +id: Int
    +consultation_id: Int
    +initiator_id: Int
    +started_at: Date
    +ended_at: Date
    +duration_seconds: Int
    +status: String
}

class VideoCall {
    +id: Int
    +consultation_id: Int
    +initiator_id: Int
    +started_at: Date
    +ended_at: Date
    +duration_seconds: Int
    +status: String
}

User "1" --> "many" Consultation : participates >
Consultation "1" --> "many" Message : texts >
Consultation "1" --> "many" AudioMessage : audio >
Consultation "1" --> "many" VideoMessage : video >
Consultation "1" --> "many" AudioCall : audioCalls >
Consultation "1" --> "many" VideoCall : videoCalls >


%% ============================
%% ========= DONATIONS =========
%% ============================

class Sponsorship {
    +id: Int
    +patient_id: Int
    +treatment_type: String
    +goal_amount: Decimal
    +donated_amount: Decimal
    +description: Text
    +status: "open" | "funded" | "closed"
    +created_at: Date
}

class Transaction {
    +id: Int
    +sponsorship_id: Int
    +donor_id: Int
    +amount: Decimal
    +payment_method: String
    +receipt_url: String
    +status: String
    +stripe_payment_id: String
    +stripe_charge_id: String
    +created_at: Date
}

User "1" --> "many" Transaction : donates >
Sponsorship "1" --> "many" Transaction : has >


%% ============================
%% ====== MEDICINES & EQUIP =====
%% ============================

class MedicineRequest {
    +id: Int
    +patient_id: Int
    +medicine_name: String
    +quantity: Int
    +urgency: String
    +status: String
    +request_date: Date
}

class EquipmentRegistry {
    +id: Int
    +item_name: String
    +description: Text
    +quantity: Int
    +location: String
    +available: Boolean
    +listed_by: Int
}

class EquipmentRequest {
    +id: Int
    +ngo_id: Int
    +item_name: String
    +quantity: Int
    +purpose: Text
    +status: String
    +requested_at: Date
}

User "1" --> "many" MedicineRequest : requests >
User "1" --> "many" EquipmentRegistry : lists >


%% ============================
%% ========== NGOs ============
%% ============================

class NGO {
    +id: Int
    +user_id: Int
    +name: String
    +contact_info: String
    +verified: Boolean
    +created_at: Date
}

class NGOMission {
    +id: Int
    +ngo_id: Int
    +mission_type: String
    +mission_date: Date
    +location: String
    +doctor_needed: Boolean
    +description: Text
}

NGO "1" --> "many" NGOMission : organizes >


%% ============================
%% ABSOLUTE NEW MODULES BELOW
%% ============================

%% ======== SUPPORT GROUPS ========

class SupportGroup {
    +id: Int
    +name: String
    +description: Text
    +category: String
    +is_anonymous: Boolean
    +created_by: Int
    +created_at: Date
}

class SupportGroupMember {
    +id: Int
    +group_id: Int
    +user_id: Int
    +joined_at: Date
}

class SupportGroupMessage {
    +id: Int
    +group_id: Int
    +sender_id: Int
    +message_text: Text
    +sent_at: Date
}

SupportGroup "1" --> "many" SupportGroupMember : members >
SupportGroup "1" --> "many" SupportGroupMessage : messages >


%% ======== MENTAL HEALTH ========

class MentalHealthSession {
    +id: Int
    +user_id: Int
    +counselor_id: Int
    +session_date: DateTime
    +mode: String
    +status: String
    +notes: Text
    +created_at: Date
}

class TherapyResource {
    +id: Int
    +title: String
    +description: Text
    +resource_type: String
    +resource_url: String
    +created_by: Int
    +created_at: Date
}


%% ======== ANONYMOUS THERAPY ========

class AnonTherapyChat {
    +id: Int
    +user_id: Int
    +counselor_id: Int
    +status: "active" | "closed"
    +started_at: Date
    +ended_at: Date
}

class AnonChatMessage {
    +id: Int
    +chat_id: Int
    +sender_id: Int
    +message_text: Text
    +sent_at: Date
}

class AnonAudioTherapyChat {
    +id: Int
    +user_id: Int
    +counselor_id: Int
    +status: String
    +started_at: Date
    +ended_at: Date
}

class AnonAudioMessage {
    +id: Int
    +chat_id: Int
    +sender_id: Int
    +audio_url: String
    +duration_seconds: Int
    +sent_at: Date
}

class AnonVideoTherapyChat {
    +id: Int
    +user_id: Int
    +counselor_id: Int
    +status: String
    +started_at: Date
    +ended_at: Date
}

class AnonVideoMessage {
    +id: Int
    +chat_id: Int
    +sender_id: Int
    +video_url: String
    +duration_seconds: Int
    +sent_at: Date
}


%% ============================
%% ======= CONTENT & LOGS =====
%% ============================

class HealthGuide {
    +id: Int
    +title: String
    +description: Text
    +category: String
    +language: "ar" | "en"
    +created_by: Int
    +created_at: Date
}

class Alert {
    +id: Int
    +type: String
    +message: Text
    +region: String
    +severity: String
    +source: String
    +created_at: Date
}

class Log {
    +id: Int
    +user_id: Int
    +action: String
    +ip_address: String
    +timestamp: Date
}

