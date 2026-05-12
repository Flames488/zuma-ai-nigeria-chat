/** Hospital module types. */

export type HospitalIntent =
  | "BOOK_APPOINTMENT"
  | "LIST_DOCTORS"
  | "GET_SLOTS"
  | "CANCEL_APPOINTMENT"
  | "CHECK_APPOINTMENT"
  | "PRICING_FAQ"
  | "GENERAL_FAQ"
  | "UNKNOWN";

export interface HospitalConfig {
  /** Vitar API base URL (e.g. https://vitar.example.com/api). Read at request time. */
  vitar_base_url?: string;
  /** Hospital display name override. */
  hospital_name?: string;
  /** Free-form FAQ snippets / pricing answers. */
  faq?: string;
  /** Currency for prices, defaults to NGN. */
  currency?: string;
}

export interface VitarDoctor {
  id: string;
  name: string;
  specialty: string;
  bio?: string;
}

export interface VitarSlot {
  id: string;
  doctor_id: string;
  start_time: string; // ISO
  end_time: string;
  available: boolean;
}

export interface VitarAppointment {
  id: string;
  doctor_id: string;
  doctor_name?: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
  status: "booked" | "cancelled" | "completed";
}

/** Multi-turn booking state machine, persisted in conversation history. */
export type HospitalBookingStep =
  | "idle"
  | "awaiting_specialty"
  | "awaiting_doctor"
  | "awaiting_slot"
  | "awaiting_patient_name"
  | "confirming";

export interface HospitalBookingState {
  step: HospitalBookingStep;
  specialty?: string;
  doctorId?: string;
  doctorName?: string;
  slotId?: string;
  slotStart?: string;
  patientName?: string;
}
