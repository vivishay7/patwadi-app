/**
 * Database Types
 * Matches Supabase table schemas
 */

export type UserRole = "customer" | "lmp" | "linehaul";

export type ApprovalStatus = "pending" | "approved";

export type OperatorStatus = "active" | "suspended" | "inactive";

export type ProofType = "code" | "photo";

export type SimplifiedParcelState =
  | "created"
  | "pickup_confirmed"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "blocked_exception";

export type PaymentStatus = "pending" | "confirmed" | "failed";

/**
 * Profile table row
 */
export interface Profile {
  id: string;
  phone: string | null;
  email?: string | null;
  full_name?: string | null;
  role: UserRole;
  approval_status?: ApprovalStatus;
  operator_status?: OperatorStatus;
  /** v6 §6.1 — false = not currently available for co-conductor/transfer target. */
  is_available?: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Profile insert payload
 */
export interface ProfileInsert {
  id: string;
  phone?: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  approval_status?: ApprovalStatus;
}

/**
 * Profile update payload
 */
export interface ProfileUpdate {
  phone?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  approval_status?: ApprovalStatus;
}

/**
 * Driver KYC data
 */
export interface DriverKyc {
  id?: string;
  user_id: string;
  aadhaar_number?: string;
  license_number?: string;
  photo_url?: string;
  status: "pending" | "verified" | "rejected";
  created_at?: string;
}

/**
 * Driver Bus Details
 */
export interface DriverBusDetails {
  id?: string;
  user_id: string;
  operator_name?: string;
  routes?: string[];
  vehicle_number?: string;
  capacity?: number;
  created_at?: string;
}

/**
 * Order/Parcel data
 */
export interface Order {
  id: string;
  customer_id: string;
  /**
   * Legacy field from earlier implementation. Do not use as source of truth.
   * Custody state must be derived from custody events.
   */
  status: "pending" | "accepted" | "in_transit" | "delivered" | "cancelled";

  /** Corridor key like "Delhi-Chandigarh" */
  corridor_key?: string;

  /** Payment must be confirmed before any custody actions */
  payment_status?: PaymentStatus;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;

  /** Actor fields from earlier implementation; will be replaced by custody events */
  driver_id?: string;

  pickup_location: string;
  dropoff_location: string;
  weight_kg?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  contents?: string;
  price_estimate?: number;
  final_price?: number;
  created_at: string;
  updated_at?: string;

  /** v6 §2.1 — linehaul trip this parcel is attached to (null until attached) */
  trip_id?: string;
  /** v6 §13.3 — mirrors the active parcel_recoveries row for fast filtering */
  recovery_of_trip_id?: string;
  recovered_by_trip_id?: string;

  blocked_exception?: boolean;
}

export interface CustodyEvent {
  id: string;
  parcel_id: string;
  from_user_id: string;
  to_user_id: string;
  from_role: UserRole;
  to_role: UserRole | "customer";
  proof_type: ProofType;
  /** For photo: storage path/file key. For code: unused in MVP (code is validated server-side). */
  proof_value: string;
  uploaded_by?: string;
  uploaded_at?: string;
  mime_type?: string;
  created_at: string;
}

/**
 * Auth User (from Supabase auth)
 */
export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

/**
 * App User (combined auth + profile)
 */
export interface AppUser {
  id: string;
  phone: string | null;
  email?: string | null;
  full_name?: string | null;
  role: UserRole | null;
  approval_status?: ApprovalStatus;
  operator_status?: OperatorStatus;
  isAdmin?: boolean;
  isNewUser: boolean;
  /** Held until RoleSelect creates the profile row */
  pendingFullName?: string;
  pendingEmail?: string;
}

export interface AdminProfile {
  user_id: string;
  email: string;
  full_name?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

/* -----------------------------------------------------------
   v6 Phase 2 — Linehaul trips (§2.3-2.6) and recovery (§13.2)
------------------------------------------------------------ */

export type TripStatus = "draft" | "open" | "closed" | "completed" | "cancelled";

/** v6 §2.3 */
export interface LinehaulTrip {
  id: string;
  corridor_id: string; // FK -> CorridorDefinition.key
  route_label: string;
  bus_number: string;
  driver_name: string;
  driver_phone: string;
  scheduled_departure_at: string; // ISO timestamp
  expected_arrival_at: string;
  capacity_count?: number;
  capacity_weight?: number;
  bus_proof_photo_path: string; // mandatory before draft -> open
  status: TripStatus;
  accepts_new_parcels: boolean;
  details_locked: boolean;
  created_by_conductor_id: string;
  created_at: string;
  updated_at?: string;
  closed_to_new_parcels_at?: string; // set when accepts_new_parcels -> false
  details_locked_at?: string; // set when details_locked -> true
  is_extra_trip: boolean;
  extra_trip_approved_by?: string;
  closed_at?: string;
  is_overdue?: boolean;
  /** Minutes added via one-time conductor self-service extension (typically 30). */
  arrival_extension_minutes?: number;
  /** Set when the conductor used their one-time arrival extension. */
  arrival_extension_used_at?: string;
  /** Admin review flag when extension was requested far from destination. */
  admin_flag_arrival_extension?: boolean;
  /** full = solo trip; partial = planned co-conductor handoff. */
  trip_coverage_type?: "full" | "partial";
  planned_co_conductor_id?: string;
  admin_flag_reason?: string;
  admin_review_required?: boolean;
  operator_declared_co_conductor_id?: string;
  incomplete_trip_resolved_at?: string;
}

export type ConductorRole = "primary" | "co_conductor";

/** v6 §2.4 */
export interface LinehaulTripConductor {
  id: string;
  trip_id: string;
  conductor_id: string;
  role: ConductorRole;
  added_by: string; // actor who added this row
  added_at: string;
  active_from?: string;
  active_until?: string;
  reason?: string;
  location_at_add_lat?: number; // raw capture, no scoring (co-conductor)
  location_at_add_lng?: number;
}

export type TransferStatus =
  | "rejected"
  | "rejected_timeout"
  | "pending_acceptance"
  | "accepted"
  | "accepted_with_flag"
  | "auto_accepted"
  | "auto_accepted_with_flag";

/** v6 §2.5 */
export interface LinehaulTripTransferRequest {
  id: string;
  trip_id: string;
  from_conductor_id: string;
  to_conductor_id: string;
  requested_at: string;
  reason?: string;
  from_location_lat?: number;
  from_location_lng?: number;
  to_location_lat?: number;
  to_location_lng?: number;
  risk_reasons: string[]; // empty array if none fired
  admin_review_required: boolean;
  status: TransferStatus;
  accept_by?: string;
  accepted_at?: string;
  trip_progress_pct_at_accept?: number;
  payee_conductor_id?: string;
  not_physically_traveling?: boolean | null; // null = unknown until Phase 4
}

/** v6 §2.6 */
export interface TripAuditLog {
  id: string;
  trip_id: string;
  actor_id: string;
  action: string; // e.g. "field_edit", "co_conductor_added", "parcel_reassigned", "exception_created"
  before_value?: unknown;
  after_value?: unknown;
  created_at: string;
  near_departure: boolean; // true if action occurred within 60min of scheduled_departure_at
}

export type RecoveryStatus = "open" | "in_progress" | "resolved" | "unrecoverable";

/** v6 §13.2 */
export interface ParcelRecovery {
  id: string;
  parcel_id: string; // Order.id
  recovery_of_trip_id: string; // trip the parcel was on when recovery opened
  recovered_by_trip_id?: string; // set once reassigned to a trip that completes the journey
  status: RecoveryStatus;
  opened_at: string;
  opened_by: string; // admin user id
  reason: string;
  escalation_level: number;
  last_escalated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

/**
 * Customer saved address (address book)
 */
export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string | null;
  place_name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone_number?: string | null;
  whatsapp_notifications?: boolean | null;
  street?: string | null;
  apartment_building?: string | null;
  landmark?: string | null;
  delivery_instructions?: string | null;
  should_call_for_instructions?: boolean | null;
  created_at: string;
  updated_at?: string;
}

