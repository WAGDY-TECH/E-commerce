export type Lang = 'ar' | 'en'

export const ASSET_STATUSES = [
  'draft',
  'active',
  'available',
  'in_use',
  'in_transfer',
  'in_maintenance',
  'temporarily_stopped',
  'lost',
  'stolen',
  'out_of_service',
  'sold_disposed',
  'archived',
] as const
export type AssetStatus = (typeof ASSET_STATUSES)[number]

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'emergency',
  'operational_check',
  'vendor',
  'external',
] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const REQUEST_STATUSES = [
  'new',
  'reviewed',
  'assigned',
  'in_progress',
  'waiting_part',
  'waiting_vendor',
  'completed',
  'closed',
  'rejected',
  'cancelled',
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export type Priority = (typeof PRIORITIES)[number]

export const CALIBRATION_RESULTS = [
  'pass',
  'pass_with_notes',
  'fail',
  'needs_repair_before_recalibration',
  'not_required',
] as const
export type CalibrationResult = (typeof CALIBRATION_RESULTS)[number]

export const TRANSFER_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
  'handed_over',
  'received',
  'cancelled',
] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export type PermissionKey =
  | 'dashboard.view'
  | 'assets.view'
  | 'assets.create'
  | 'assets.edit'
  | 'assets.approve'
  | 'assets.archive'
  | 'maintenance.create'
  | 'maintenance.handle'
  | 'workorders.edit'
  | 'calibration.record'
  | 'transfers.create'
  | 'transfers.approve'
  | 'structure.manage'
  | 'vendors.manage'
  | 'reports.view'
  | 'exports.run'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.view'

export interface Role {
  id: string
  name_ar: string
  name_en: string
  permissions: PermissionKey[]
  data_scope: 'all' | 'department' | 'own'
}

export interface User {
  id: string
  username: string
  full_name_ar: string
  full_name_en: string
  email: string
  password: string
  role_id: string
  department_id?: string
  active: boolean
  created_at: string
}

export interface Department {
  id: string
  code: string
  name_ar: string
  name_en: string
  manager_user_id?: string
  main_location_id?: string
  active: boolean
  notes?: string
}

export interface Location {
  id: string
  building_ar: string
  building_en: string
  floor: string
  wing?: string
  room_ar: string
  room_en: string
  department_id?: string
  active: boolean
}

export interface AssetCategory {
  id: string
  name_ar: string
  name_en: string
  medical: boolean
}

export interface Asset {
  id: string
  asset_code: string
  serial_number?: string
  name_ar: string
  name_en: string
  category_id: string
  brand?: string
  model?: string
  description?: string
  image_url?: string
  status: AssetStatus
  risk_level: RiskLevel
  clinical_use: boolean
  calibration_required: boolean
  safety_requirements?: string
  department_id: string
  location_id: string
  assigned_to?: string
  owning_department_id?: string
  cost_center?: string
  purchase_date?: string
  purchase_cost?: number
  currency?: string
  po_number?: string
  supplier_id?: string
  warranty_months?: number
  warranty_end_date?: string
  expected_life_years?: number
  maintenance_interval_days?: number
  next_calibration_date?: string
  created_at: string
  updated_at: string
  archived_at?: string
}

export interface Supplier {
  id: string
  name_ar: string
  name_en: string
  registration_number?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  product_types?: string
  active: boolean
  notes?: string
}

export interface Contract {
  id: string
  contract_number: string
  supplier_id: string
  type_ar: string
  type_en: string
  start_date: string
  end_date: string
  value?: number
  scope?: string
  asset_ids: string[]
  contact?: string
  notes?: string
}

export interface Warranty {
  id: string
  asset_id: string
  supplier_id?: string
  warranty_number?: string
  start_date: string
  end_date: string
  terms?: string
  contact?: string
}

export interface MaintenanceRequest {
  id: string
  request_number: string
  asset_id: string
  requested_by: string
  department_id: string
  type: MaintenanceType
  problem_description: string
  priority: Priority
  reported_at: string
  status: RequestStatus
  notes?: string
  attachment_names?: string[]
}

export interface WorkOrder {
  id: string
  order_number: string
  request_id: string
  technician_id?: string
  start_date?: string
  due_date?: string
  completed_date?: string
  diagnosis?: string
  actions_taken?: string
  parts_used?: string
  labor_hours?: number
  cost?: number
  test_result?: string
  recommendation?: string
  status: RequestStatus
}

export interface MaintenancePlan {
  id: string
  name_ar: string
  name_en: string
  category_id?: string
  interval_days: number
  grace_days: number
  active: boolean
  last_generated?: string
  next_due?: string
}

export interface CalibrationRecord {
  id: string
  asset_id: string
  check_type: string
  performed_by: string
  certificate_number?: string
  performed_at: string
  due_date?: string
  result: CalibrationResult
  measurement_range?: string
  attachment_name?: string
  notes?: string
}

export interface TransferRequest {
  id: string
  transfer_number: string
  asset_ids: string[]
  from_location_id: string
  to_location_id: string
  from_department_id: string
  to_department_id: string
  reason: string
  proposed_date: string
  sent_by: string
  received_by?: string
  status: TransferStatus
  handover_condition?: string
  handover_notes?: string
  created_at: string
}

export interface MovementLog {
  id: string
  asset_id: string
  action_ar: string
  action_en: string
  details?: string
  user_id: string
  at: string
}

export interface AppNotification {
  id: string
  type_ar: string
  type_en: string
  message_ar: string
  message_en: string
  link?: string
  severity: 'info' | 'warning' | 'danger'
  user_id: string | 'all'
  at: string
  read: boolean
}

export interface AuditLogEntry {
  id: string
  user_id: string
  action_ar: string
  action_en: string
  entity_type: string
  entity_id?: string
  old_value?: string
  new_value?: string
  at: string
  ip: string
}

export interface AppSettings {
  calibration_reminders: number[]
  session_timeout_minutes: number
  hospital_name_ar: string
  hospital_name_en: string
}

export interface Database {
  users: User[]
  roles: Role[]
  departments: Department[]
  locations: Location[]
  categories: AssetCategory[]
  assets: Asset[]
  suppliers: Supplier[]
  contracts: Contract[]
  warranties: Warranty[]
  maintenance_requests: MaintenanceRequest[]
  work_orders: WorkOrder[]
  maintenance_plans: MaintenancePlan[]
  calibration_records: CalibrationRecord[]
  transfer_requests: TransferRequest[]
  movement_logs: MovementLog[]
  notifications: AppNotification[]
  audit_logs: AuditLogEntry[]
  settings: AppSettings
}
