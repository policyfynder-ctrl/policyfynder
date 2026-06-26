// Application-level types
// These mirror the database schema defined in supabase/migrations/
// See architecture/database-schema.md for full column details.

// ── Enums ──────────────────────────────────────────────────

// Legacy 3-value role on profiles.role — kept for backward compat.
// New code: use UserRoleName + the user_roles table instead.
export type UserRole = 'admin' | 'rm' | 'customer'

// Expanded role names matching the roles table
export type UserRoleName =
  | 'super_admin'
  | 'admin'
  | 'branch_manager'
  | 'sales_manager'
  | 'team_leader'
  | 'rm'
  | 'customer'

export type LeadStatus = 'new' | 'scheduled' | 'contacted' | 'proposal_sent' | 'converted' | 'lost'

// Legacy enum values matching the lead_source DB enum.
// New code: use LeadSourceRecord (the lead_sources lookup table) via source_id FK.
export type LeadSourceSlug = 'instagram' | 'facebook' | 'google' | 'direct' | 'referral' | 'other'

/** @deprecated Use source_id FK to lead_sources table instead */
export type LeadSource = LeadSourceSlug

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'

export type AssignmentMethod =
  | 'manual'
  | 'round_robin'
  | 'least_busy'
  | 'specialist'
  | 'geographic'
  | 'system'

// Policy module (migration 020). PolicyFynder tracks the policy lifecycle, not
// payments — there is no payment-frequency / billing model.
export type PolicyStatus = 'draft' | 'active' | 'lapsed' | 'cancelled' | 'expired'

export type NoteType = 'general' | 'call' | 'meeting' | 'follow_up' | 'internal'

// morning and afternoon are deprecated — use custom with explicit start_time/end_time
export type LeaveType = 'full_day' | 'custom' | 'morning' | 'afternoon'

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app'

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'

export type NotificationType =
  | 'appointment_confirmation'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'lead_assigned'
  | 'lead_updated'
  | 'follow_up'

// ── RBAC ──────────────────────────────────────────────────

export interface Role {
  id: string
  name: UserRoleName
  display_name: string
  description: string | null
  is_system: boolean
  created_at: string
}

export interface Permission {
  id: string
  resource: string
  action: string
  description: string | null
  created_at: string
}

export interface RolePermission {
  role_id: string
  permission_id: string
}

// scope_type = 'global' → scope_id is null
// scope_type = 'branch' → scope_id is a branch UUID
// scope_type = 'team'   → scope_id is a team UUID
export interface UserRoleAssignment {
  id: string
  profile_id: string
  role_id: string
  scope_type: 'global' | 'branch' | 'team'
  scope_id: string | null
  granted_by: string | null
  granted_at: string
  expires_at: string | null
}

// ── Org Structure ──────────────────────────────────────────

export interface Team {
  id: string
  branch_id: string
  name: string
  team_leader_rm_id: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TeamMember {
  id: string
  team_id: string
  rm_id: string
  joined_at: string
  left_at: string | null
  is_current: boolean
}

// ── Capacity Config ─────────────────────────────────────────

export interface WorkingHoursConfig {
  id: string
  branch_id: string | null // null = applies to all branches
  day_of_week: number // 0=Sunday … 6=Saturday
  slot_start: string // HH:MM
  slot_duration_minutes: number
  effective_from: string
  effective_until: string | null
  is_active: boolean
  created_at: string
}

export interface BranchHoliday {
  id: string
  branch_id: string | null // null = all branches
  holiday_date: string
  name: string
  created_at: string
}

// ── Lead Sources ─────────────────────────────────────────────

export interface LeadSourceRecord {
  id: string
  name: string
  slug: LeadSourceSlug | string
  channel_type: 'social' | 'search' | 'organic' | 'referral' | 'direct' | 'other'
  cost_per_lead_cents: number // divide by 100 to display
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Core Entities ──────────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole // legacy column; use user_roles for new permission checks
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Branch {
  id: string
  name: string
  code: string | null
  address: string | null
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InsuranceProduct {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface RelationshipManager {
  id: string
  profile_id: string
  branch_id: string | null
  team_id: string | null
  employee_id: string | null
  is_active: boolean
  max_daily_appointments: number
  service_areas: string[] // postal codes or city slugs for geographic routing
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface RmSchedule {
  id: string
  rm_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_time: string // HH:MM:SS
  end_time: string
  is_active: boolean
  effective_from: string
  effective_until: string | null
  created_at: string
}

export interface RmLeave {
  id: string
  rm_id: string
  leave_date: string
  leave_type: LeaveType
  start_time: string | null // required when leave_type = 'custom'
  end_time: string | null // required when leave_type = 'custom'
  reason: string | null
  approved_by: string | null
  created_at: string
}

export interface Lead {
  id: string
  customer_profile_id: string | null
  assigned_rm_id: string | null
  branch_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  status: LeadStatus
  source: LeadSource // legacy enum column
  source_id: string | null // FK to lead_sources table (new)
  source_campaign: string | null
  source_medium: string | null
  source_content: string | null
  insurance_interest: string[]
  priority: number // 1=urgent … 5=deferred; default 3
  lead_score: number
  follow_up_at: string | null
  sla_deadline_at: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  lost_reason: string | null
  converted_value_cents: number | null // divide by 100 to display
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Appointment {
  id: string
  lead_id: string
  rm_id: string
  branch_id: string | null
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  confirmation_token: string | null
  notes: string | null
  cancellation_reason: string | null
  rescheduled_from_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface LeadAssignment {
  id: string
  lead_id: string
  rm_id: string
  assigned_by: string | null
  method: AssignmentMethod
  is_current: boolean
  notes: string | null
  assigned_at: string
  unassigned_at: string | null
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string
  note_type: NoteType
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface LeadStageHistory {
  id: string
  lead_id: string
  from_stage: LeadStatus | null
  to_stage: LeadStatus
  changed_by: string | null
  reason: string | null
  created_at: string
}

export interface LeadFollowUp {
  id: string
  lead_id: string
  rm_id: string
  scheduled_at: string
  completed_at: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface NotificationTemplate {
  id: string
  name: string
  channel: NotificationChannel
  language: string
  external_template_id: string | null // provider-specific template ID (e.g. WhatsApp template name)
  subject: string | null // email subject
  body_preview: string // human-readable preview for admin reference
  required_variables: string[] // payload must include all of these before sending
  is_active: boolean
  approved_at: string | null // when WhatsApp template was approved by Meta
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  lead_id: string | null
  appointment_id: string | null
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  template_id: string | null // legacy free-text reference
  template_ref_id: string | null // FK to notification_templates
  payload: Record<string, unknown>
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  provider_message_id: string | null
  scheduled_at: string
  sent_at: string | null
  error_message: string | null
  created_at: string
}

// ── Utility Types ──────────────────────────────────────────

// Slot availability returned by v_slot_availability view
export interface SlotAvailability {
  slot_date: string
  slot_start: string // HH:MM (renamed from slot_time; view now uses slot_start)
  slot_end: string
  branch_id: string | null
  total_capacity: number
  available_spots: number // renamed from available_slots
}

// Lead with joined profile and RM (common query shape)
export interface LeadWithDetails extends Lead {
  source_record?: LeadSourceRecord
  profile?: Profile
  rm?: RelationshipManager & {
    profile: Profile
    team?: Team
  }
  follow_ups?: LeadFollowUp[]
}

// RM with full context (used in admin views)
export interface RmWithDetails extends RelationshipManager {
  profile: Profile
  team: Team | null
  branch: Branch | null
}
