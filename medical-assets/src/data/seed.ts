import type { Database } from '../types'

const now = new Date()
const iso = (d: Date) => d.toISOString()
const daysFromNow = (n: number) => iso(new Date(now.getTime() + n * 86400000))
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000))

export const PERMISSION_LIST = {
  'dashboard.view': { ar: 'عرض لوحة التحكم', en: 'View dashboard' },
  'assets.view': { ar: 'عرض الأصول', en: 'View assets' },
  'assets.create': { ar: 'إنشاء أصل', en: 'Create asset' },
  'assets.edit': { ar: 'تعديل أصل', en: 'Edit asset' },
  'assets.approve': { ar: 'اعتماد أصل', en: 'Approve asset' },
  'assets.archive': { ar: 'أرشفة أصل', en: 'Archive asset' },
  'maintenance.create': { ar: 'إنشاء طلب صيانة', en: 'Create maintenance request' },
  'maintenance.handle': { ar: 'معالجة الصيانة', en: 'Handle maintenance' },
  'workorders.edit': { ar: 'تعديل أمر عمل', en: 'Edit work order' },
  'calibration.record': { ar: 'تسجيل معايرة', en: 'Record calibration' },
  'transfers.create': { ar: 'إنشاء طلب نقل', en: 'Create transfer request' },
  'transfers.approve': { ar: 'اعتماد النقل', en: 'Approve transfer' },
  'structure.manage': { ar: 'إدارة المواقع والإدارات', en: 'Manage structure' },
  'vendors.manage': { ar: 'إدارة الموردين والعقود', en: 'Manage vendors' },
  'reports.view': { ar: 'عرض التقارير', en: 'View reports' },
  'exports.run': { ar: 'تصدير البيانات', en: 'Export data' },
  'users.manage': { ar: 'إدارة المستخدمين', en: 'Manage users' },
  'settings.manage': { ar: 'إدارة الإعدادات', en: 'Manage settings' },
  'audit.view': { ar: 'عرض سجل التدقيق', en: 'View audit log' },
} as const

export function seedDatabase(): Database {
  const roles: Database['roles'] = [
    {
      id: 'role-admin',
      name_ar: 'مدير النظام',
      name_en: 'System Administrator',
      permissions: Object.keys(PERMISSION_LIST) as any,
      data_scope: 'all',
    },
    {
      id: 'role-asset-manager',
      name_ar: 'مدير الأصول',
      name_en: 'Asset Manager',
      permissions: [
        'dashboard.view', 'assets.view', 'assets.create', 'assets.edit', 'assets.approve',
        'assets.archive', 'maintenance.create', 'maintenance.handle', 'workorders.edit',
        'transfers.create', 'transfers.approve', 'structure.manage', 'vendors.manage',
        'reports.view', 'exports.run', 'audit.view',
      ],
      data_scope: 'all',
    },
    {
      id: 'role-biomedical',
      name_ar: 'مسؤول الصيانة الطبية',
      name_en: 'Biomedical Engineer',
      permissions: [
        'dashboard.view', 'assets.view', 'assets.edit', 'maintenance.create', 'maintenance.handle',
        'workorders.edit', 'calibration.record', 'reports.view', 'exports.run',
      ],
      data_scope: 'all',
    },
    {
      id: 'role-dept-manager',
      name_ar: 'مدير القسم',
      name_en: 'Department Manager',
      permissions: [
        'dashboard.view', 'assets.view', 'maintenance.create', 'transfers.create',
        'reports.view', 'exports.run',
      ],
      data_scope: 'department',
    },
    {
      id: 'role-dept-user',
      name_ar: 'المستخدم التشغيلي',
      name_en: 'Department User',
      permissions: ['dashboard.view', 'assets.view', 'maintenance.create', 'transfers.create'],
      data_scope: 'department',
    },
    {
      id: 'role-viewer',
      name_ar: 'مستخدم للقراءة فقط',
      name_en: 'Viewer / Auditor',
      permissions: ['dashboard.view', 'assets.view', 'reports.view', 'audit.view'],
      data_scope: 'all',
    },
  ]

  const departments: Database['departments'] = [
    { id: 'dep-ops', code: 'OPS', name_ar: 'غرفة العمليات', name_en: 'Operating Rooms', active: true },
    { id: 'dep-icu', code: 'ICU', name_ar: 'العناية المركزة', name_en: 'Intensive Care', active: true },
    { id: 'dep-ed', code: 'ED', name_ar: 'الطوارئ', name_en: 'Emergency', active: true },
    { id: 'dep-internal', code: 'INT', name_ar: 'جناح الباطنة', name_en: 'Internal Medicine Ward', active: true },
    { id: 'dep-rad', code: 'RAD', name_ar: 'قسم الأشعة', name_en: 'Radiology', active: true },
    { id: 'dep-lab', code: 'LAB', name_ar: 'المختبر', name_en: 'Laboratory', active: true },
    { id: 'dep-sterile', code: 'CSSD', name_ar: 'التعقيم المركزي', name_en: 'Central Sterilization', active: true },
    { id: 'dep-sleep', code: 'SLP', name_ar: 'جناح التنويم', name_en: 'Inpatient Ward', active: true },
  ]

  const locations: Database['locations'] = [
    { id: 'loc-1', building_ar: 'المبنى الرئيسي', building_en: 'Main Building', floor: '2', wing: 'A', room_ar: 'غرفة العمليات 1', room_en: 'OR 1', department_id: 'dep-ops', active: true },
    { id: 'loc-2', building_ar: 'المبنى الرئيسي', building_en: 'Main Building', floor: '3', wing: 'B', room_ar: 'العناية 3', room_en: 'ICU 3', department_id: 'dep-icu', active: true },
    { id: 'loc-3', building_ar: 'المبنى الرئيسي', building_en: 'Main Building', floor: '1', wing: 'A', room_ar: 'قاعة الطوارئ', room_en: 'ED Hall', department_id: 'dep-ed', active: true },
    { id: 'loc-4', building_ar: 'المبنى الرئيسي', building_en: 'Main Building', floor: '4', wing: 'C', room_ar: 'غرفة 402', room_en: 'Room 402', department_id: 'dep-internal', active: true },
    { id: 'loc-5', building_ar: 'مبنى التشخيص', building_en: 'Diagnostics Building', floor: '1', wing: '', room_ar: 'قاعة الأشعة', room_en: 'X-Ray Room', department_id: 'dep-rad', active: true },
    { id: 'loc-6', building_ar: 'مبنى التشخيص', building_en: 'Diagnostics Building', floor: '2', wing: '', room_ar: 'مختبر الدم', room_en: 'Blood Lab', department_id: 'dep-lab', active: true },
    { id: 'loc-7', building_ar: 'مبنى الخدمات', building_en: 'Services Building', floor: 'G', wing: '', room_ar: 'قاعة التعقيم', room_en: 'Sterilization Hall', department_id: 'dep-sterile', active: true },
    { id: 'loc-8', building_ar: 'المبنى الرئيسي', building_en: 'Main Building', floor: '5', wing: 'D', room_ar: 'غرفة 512', room_en: 'Room 512', department_id: 'dep-sleep', active: true },
    { id: 'loc-store', building_ar: 'مبنى الخدمات', building_en: 'Services Building', floor: 'G', wing: '', room_ar: 'مخزن الأصول', room_en: 'Asset Store', department_id: undefined, active: true },
  ]

  const categories: Database['categories'] = [
    { id: 'cat-anesthesia', name_ar: 'أجهزة التخدير', name_en: 'Anesthesia Machines', medical: true },
    { id: 'cat-ventilator', name_ar: 'أجهزة التنفس الصناعي', name_en: 'Ventilators', medical: true },
    { id: 'cat-monitor', name_ar: 'أجهزة مراقبة العلامات الحيوية', name_en: 'Vital Signs Monitors', medical: true },
    { id: 'cat-infusion', name_ar: 'مضخات المحاليل', name_en: 'Infusion Pumps', medical: true },
    { id: 'cat-imaging', name_ar: 'أجهزة الأشعة', name_en: 'Imaging Equipment', medical: true },
    { id: 'cat-lab', name_ar: 'أجهزة المختبر', name_en: 'Laboratory Equipment', medical: true },
    { id: 'cat-bed', name_ar: 'أسرّة المرضى الطبية', name_en: 'Medical Beds', medical: true },
    { id: 'cat-sterile', name_ar: 'أجهزة التعقيم', name_en: 'Sterilization Equipment', medical: true },
    { id: 'cat-admin', name_ar: 'أصول إدارية', name_en: 'Administrative Assets', medical: false },
  ]

  const suppliers: Database['suppliers'] = [
    { id: 'sup-1', name_ar: 'شركة التقنية الطبية', name_en: 'MedTech Co.', registration_number: 'CR-10293', contact_person: 'أحمد سالم', email: 'sales@medtech.example', phone: '+966-55-111-2222', address: 'الرياض', product_types: 'أجهزة تخدير ومراقبة', active: true, notes: '' },
    { id: 'sup-2', name_ar: 'مؤسسة الرعاية للأجهزة', name_en: 'Care Devices Est.', registration_number: 'CR-20481', contact_person: 'منى العلي', email: 'info@caredev.example', phone: '+966-56-333-4444', address: 'جدة', product_types: 'مضخات وأسرّة', active: true, notes: '' },
    { id: 'sup-3', name_ar: 'الشركة العالمية للتصوير', name_en: 'Global Imaging Corp.', registration_number: 'CR-33771', contact_person: 'خالد فهد', email: 'contact@globalimg.example', phone: '+966-50-999-8888', address: 'الدمام', product_types: 'أجهزة أشعة', active: true, notes: '' },
    { id: 'sup-4', name_ar: 'مختبرات النخبة', name_en: 'Elite Labs', registration_number: 'CR-41220', contact_person: 'سارة ناصر', email: 'sales@elitelabs.example', phone: '+966-54-777-1212', address: 'الرياض', product_types: 'أجهزة مختبر', active: true, notes: '' },
  ]

  const users: Database['users'] = [
    { id: 'u-admin', username: 'admin', full_name_ar: 'مدير النظام', full_name_en: 'System Admin', email: 'admin@hospital.example', password: 'admin123', role_id: 'role-admin', active: true, created_at: daysAgo(400) },
    { id: 'u-am', username: 'assetmgr', full_name_ar: 'عبدالله المدير', full_name_en: 'Abdullah Asset Manager', email: 'assets@hospital.example', password: 'assets123', role_id: 'role-asset-manager', active: true, created_at: daysAgo(380) },
    { id: 'u-bio', username: 'biomed', full_name_ar: 'فيصل المهندس', full_name_en: 'Faisal Biomedical', email: 'biomed@hospital.example', password: 'biomed123', role_id: 'role-biomedical', active: true, created_at: daysAgo(370) },
    { id: 'u-ed', username: 'edmgr', full_name_ar: 'نورة مديرة الطوارئ', full_name_en: 'Noura ED Manager', email: 'ed@hospital.example', password: 'ed123', role_id: 'role-dept-manager', department_id: 'dep-ed', active: true, created_at: daysAgo(300) },
    { id: 'u-edu', username: 'eduser', full_name_ar: 'سالم مستخدم الطوارئ', full_name_en: 'Salem ED User', email: 'eduser@hospital.example', password: 'eduser123', role_id: 'role-dept-user', department_id: 'dep-ed', active: true, created_at: daysAgo(290) },
    { id: 'u-audit', username: 'auditor', full_name_ar: 'ريم المدققة', full_name_en: 'Reem Auditor', email: 'audit@hospital.example', password: 'audit123', role_id: 'role-viewer', active: true, created_at: daysAgo(200) },
  ]

  const assets: Database['assets'] = [
    { id: 'a-1', asset_code: 'AST-0001', serial_number: 'AN-99231', name_ar: 'جهاز تخدير', name_en: 'Anesthesia Machine', category_id: 'cat-anesthesia', brand: 'Dräger', model: 'Fabius Plus', status: 'active', risk_level: 'critical', clinical_use: true, calibration_required: true, safety_requirements: 'فحص كهربائي سنوي', department_id: 'dep-ops', location_id: 'loc-1', assigned_to: 'u-bio', supplier_id: 'sup-1', purchase_date: daysAgo(900), purchase_cost: 320000, currency: 'SAR', po_number: 'PO-2022-114', warranty_months: 24, warranty_end_date: daysAgo(180), expected_life_years: 10, maintenance_interval_days: 90, next_calibration_date: daysFromNow(25), created_at: daysAgo(900), updated_at: daysAgo(10) },
    { id: 'a-2', asset_code: 'AST-0002', serial_number: 'VN-55120', name_ar: 'جهاز تنفس صناعي', name_en: 'Mechanical Ventilator', category_id: 'cat-ventilator', brand: 'Hamilton', model: 'C6', status: 'in_maintenance', risk_level: 'critical', clinical_use: true, calibration_required: true, department_id: 'dep-icu', location_id: 'loc-2', assigned_to: 'u-bio', supplier_id: 'sup-1', purchase_date: daysAgo(700), purchase_cost: 280000, currency: 'SAR', po_number: 'PO-2023-045', warranty_months: 36, warranty_end_date: daysFromNow(120), expected_life_years: 10, maintenance_interval_days: 90, next_calibration_date: daysFromNow(60), created_at: daysAgo(700), updated_at: daysAgo(2) },
    { id: 'a-3', asset_code: 'AST-0003', serial_number: 'MN-77341', name_ar: 'جهاز مراقبة علامات حيوية', name_en: 'Vital Signs Monitor', category_id: 'cat-monitor', brand: 'Philips', model: 'IntelliVue MX450', status: 'active', risk_level: 'high', clinical_use: true, calibration_required: true, department_id: 'dep-ed', location_id: 'loc-3', assigned_to: 'u-ed', supplier_id: 'sup-2', purchase_date: daysAgo(500), purchase_cost: 85000, currency: 'SAR', po_number: 'PO-2023-102', warranty_months: 24, warranty_end_date: daysFromNow(20), expected_life_years: 8, maintenance_interval_days: 180, next_calibration_date: daysFromNow(85), created_at: daysAgo(500), updated_at: daysAgo(30) },
    { id: 'a-4', asset_code: 'AST-0004', serial_number: 'IP-11880', name_ar: 'مضخة محاليل', name_en: 'Infusion Pump', category_id: 'cat-infusion', brand: 'B.Braun', model: 'Infusomat', status: 'in_use', risk_level: 'high', clinical_use: true, calibration_required: true, department_id: 'dep-internal', location_id: 'loc-4', supplier_id: 'sup-2', purchase_date: daysAgo(400), purchase_cost: 18000, currency: 'SAR', po_number: 'PO-2024-011', warranty_months: 12, warranty_end_date: daysAgo(35), expected_life_years: 7, maintenance_interval_days: 180, next_calibration_date: daysFromNow(6), created_at: daysAgo(400), updated_at: daysAgo(15) },
    { id: 'a-5', asset_code: 'AST-0005', serial_number: 'XR-30021', name_ar: 'جهاز أشعة متنقل', name_en: 'Mobile X-Ray Unit', category_id: 'cat-imaging', brand: 'Siemens', model: 'Mobilett Mira', status: 'active', risk_level: 'high', clinical_use: true, calibration_required: true, department_id: 'dep-rad', location_id: 'loc-5', supplier_id: 'sup-3', purchase_date: daysAgo(650), purchase_cost: 450000, currency: 'SAR', po_number: 'PO-2023-070', warranty_months: 24, warranty_end_date: daysAgo(30), expected_life_years: 12, maintenance_interval_days: 180, next_calibration_date: daysFromNow(40), created_at: daysAgo(650), updated_at: daysAgo(20) },
    { id: 'a-6', asset_code: 'AST-0006', serial_number: 'BL-40992', name_ar: 'جهاز تحليل دم', name_en: 'Blood Analyzer', category_id: 'cat-lab', brand: 'Sysmex', model: 'XN-550', status: 'active', risk_level: 'medium', clinical_use: true, calibration_required: true, department_id: 'dep-lab', location_id: 'loc-6', supplier_id: 'sup-4', purchase_date: daysAgo(320), purchase_cost: 190000, currency: 'SAR', po_number: 'PO-2024-033', warranty_months: 24, warranty_end_date: daysFromNow(210), expected_life_years: 8, maintenance_interval_days: 120, next_calibration_date: daysFromNow(3), created_at: daysAgo(320), updated_at: daysAgo(5) },
    { id: 'a-7', asset_code: 'AST-0007', serial_number: 'ST-60011', name_ar: 'جهاز تعقيم', name_en: 'Autoclave Sterilizer', category_id: 'cat-sterile', brand: 'Getinge', model: 'HS66', status: 'available', risk_level: 'medium', clinical_use: true, calibration_required: false, department_id: 'dep-sterile', location_id: 'loc-7', supplier_id: 'sup-1', purchase_date: daysAgo(800), purchase_cost: 150000, currency: 'SAR', po_number: 'PO-2022-201', warranty_months: 24, warranty_end_date: daysAgo(260), expected_life_years: 12, maintenance_interval_days: 90, created_at: daysAgo(800), updated_at: daysAgo(40) },
    { id: 'a-8', asset_code: 'AST-0008', serial_number: 'BD-20114', name_ar: 'سرير كهربائي', name_en: 'Electric Hospital Bed', category_id: 'cat-bed', brand: 'Arjo', model: 'Envoy', status: 'in_use', risk_level: 'low', clinical_use: true, calibration_required: false, department_id: 'dep-sleep', location_id: 'loc-8', supplier_id: 'sup-2', purchase_date: daysAgo(1000), purchase_cost: 22000, currency: 'SAR', po_number: 'PO-2021-088', warranty_months: 12, warranty_end_date: daysAgo(640), expected_life_years: 10, maintenance_interval_days: 365, created_at: daysAgo(1000), updated_at: daysAgo(60) },
    { id: 'a-9', asset_code: 'AST-0009', serial_number: '', name_ar: 'جهاز مراقبة علامات حيوية (قديم)', name_en: 'Vital Signs Monitor (Legacy)', category_id: 'cat-monitor', brand: 'Mindray', model: 'uMEC12', status: 'out_of_service', risk_level: 'medium', clinical_use: true, calibration_required: true, department_id: 'dep-ed', location_id: 'loc-3', purchase_date: daysAgo(2200), purchase_cost: 40000, currency: 'SAR', warranty_months: 12, warranty_end_date: daysAgo(1800), expected_life_years: 8, created_at: daysAgo(2200), updated_at: daysAgo(80) },
    { id: 'a-10', asset_code: 'AST-0010', serial_number: 'IP-11881', name_ar: 'مضخة محاليل', name_en: 'Infusion Pump', category_id: 'cat-infusion', brand: 'B.Braun', model: 'Infusomat', status: 'lost', risk_level: 'high', clinical_use: true, calibration_required: true, department_id: 'dep-internal', location_id: 'loc-4', purchase_date: daysAgo(400), purchase_cost: 18000, currency: 'SAR', warranty_months: 12, warranty_end_date: daysAgo(35), expected_life_years: 7, created_at: daysAgo(400), updated_at: daysAgo(12) },
    { id: 'a-11', asset_code: 'AST-0011', name_ar: 'حاسوب مكتب إداري', name_en: 'Admin Desktop PC', category_id: 'cat-admin', brand: 'Dell', model: 'OptiPlex', status: 'active', risk_level: 'low', clinical_use: false, calibration_required: false, department_id: 'dep-ops', location_id: 'loc-1', purchase_date: daysAgo(200), purchase_cost: 4500, currency: 'SAR', expected_life_years: 5, created_at: daysAgo(200), updated_at: daysAgo(200) },
    { id: 'a-12', asset_code: 'AST-0012', serial_number: 'AN-99232', name_ar: 'جهاز تخدير', name_en: 'Anesthesia Machine', category_id: 'cat-anesthesia', brand: 'GE', model: 'Aespire 7900', status: 'draft', risk_level: 'critical', clinical_use: true, calibration_required: true, department_id: 'dep-ops', location_id: 'loc-store', supplier_id: 'sup-1', purchase_date: daysAgo(5), purchase_cost: 300000, currency: 'SAR', po_number: 'PO-2025-002', warranty_months: 24, warranty_end_date: daysFromNow(730), expected_life_years: 10, maintenance_interval_days: 90, created_at: daysAgo(5), updated_at: daysAgo(5) },
  ]

  const maintenance_requests: Database['maintenance_requests'] = [
    { id: 'mr-1', request_number: 'MR-0001', asset_id: 'a-2', requested_by: 'u-edu', department_id: 'dep-icu', type: 'emergency', problem_description: 'تذبذب في ضغط الهواء أثناء التشغيل', priority: 'critical', reported_at: daysAgo(3), status: 'in_progress', notes: '' },
    { id: 'mr-2', request_number: 'MR-0002', asset_id: 'a-4', requested_by: 'u-ed', department_id: 'dep-internal', type: 'corrective', problem_description: 'إنذار انسداد متكرر', priority: 'high', reported_at: daysAgo(8), status: 'waiting_part', notes: 'بانتظار وحدة محرك' },
    { id: 'mr-3', request_number: 'MR-0003', asset_id: 'a-9', requested_by: 'u-edu', department_id: 'dep-ed', type: 'corrective', problem_description: 'الشاشة لا تعمل', priority: 'medium', reported_at: daysAgo(40), status: 'closed', notes: 'قرار بالإخراج من الخدمة' },
    { id: 'mr-4', request_number: 'MR-0004', asset_id: 'a-3', requested_by: 'u-edu', department_id: 'dep-ed', type: 'preventive', problem_description: 'صيانة وقائية دورية', priority: 'low', reported_at: daysAgo(1), status: 'new', notes: '' },
  ]

  const work_orders: Database['work_orders'] = [
    { id: 'wo-1', order_number: 'WO-0001', request_id: 'mr-1', technician_id: 'u-bio', start_date: daysAgo(2), due_date: daysFromNow(2), status: 'in_progress', diagnosis: '', actions_taken: '', parts_used: '', labor_hours: 0, cost: 0, test_result: '', recommendation: '' },
    { id: 'wo-2', order_number: 'WO-0002', request_id: 'mr-2', technician_id: 'u-bio', start_date: daysAgo(6), due_date: daysFromNow(5), status: 'waiting_part', diagnosis: 'تآكل في محرك الدفع', actions_taken: 'فك المحرك وطلبات قطعة', parts_used: 'محرك دفع B.Braun', labor_hours: 4, cost: 1200, test_result: '', recommendation: '' },
    { id: 'wo-3', order_number: 'WO-0003', request_id: 'mr-3', technician_id: 'u-bio', start_date: daysAgo(38), due_date: daysAgo(35), completed_date: daysAgo(33), status: 'closed', diagnosis: 'تلف لوحة العرض', actions_taken: 'إحالة للإخراج من الخدمة', parts_used: '', labor_hours: 1, cost: 0, test_result: 'فشل', recommendation: 'استبدال الجهاز' },
  ]

  const maintenance_plans: Database['maintenance_plans'] = [
    { id: 'mp-1', name_ar: 'خطة صيانة أجهزة التخدير', name_en: 'Anesthesia Machines Plan', category_id: 'cat-anesthesia', interval_days: 90, grace_days: 7, active: true, next_due: daysFromNow(25) },
    { id: 'mp-2', name_ar: 'خطة صيانة أجهزة التنفس', name_en: 'Ventilators Plan', category_id: 'cat-ventilator', interval_days: 90, grace_days: 7, active: true, next_due: daysFromNow(60) },
    { id: 'mp-3', name_ar: 'خطة صيانة المضخات', name_en: 'Infusion Pumps Plan', category_id: 'cat-infusion', interval_days: 180, grace_days: 14, active: true, next_due: daysFromNow(170) },
    { id: 'mp-4', name_ar: 'خطة صيانة الأسرّة', name_en: 'Beds Plan', category_id: 'cat-bed', interval_days: 365, grace_days: 30, active: true, next_due: daysFromNow(300) },
  ]

  const calibration_records: Database['calibration_records'] = [
    { id: 'cal-1', asset_id: 'a-1', check_type: 'معايرة تدفق الغازات', performed_by: 'مركز القياس المعتمد', certificate_number: 'CAL-2024-118', performed_at: daysAgo(265), due_date: daysFromNow(25), result: 'pass', measurement_range: '0.2–18 L/min', notes: '' },
    { id: 'cal-2', asset_id: 'a-4', check_type: 'معايرة معدل التدفق', performed_by: 'u-bio', certificate_number: 'CAL-2024-132', performed_at: daysAgo(174), due_date: daysFromNow(6), result: 'pass_with_notes', measurement_range: '0.1–99.9 ml/h', notes: 'انحراف طفيف عند المعدلات المنخفضة' },
    { id: 'cal-3', asset_id: 'a-6', check_type: 'معايرة الجهاز المرجعي', performed_by: 'Elite Labs', certificate_number: 'CAL-2024-150', performed_at: daysAgo(178), due_date: daysFromNow(3), result: 'pass', measurement_range: '', notes: '' },
    { id: 'cal-4', asset_id: 'a-5', check_type: 'فحص جودة الصورة', performed_by: 'Global Imaging Corp.', certificate_number: 'CAL-2023-090', performed_at: daysAgo(330), due_date: daysFromNow(40), result: 'pass', measurement_range: '', notes: '' },
  ]

  const transfer_requests: Database['transfer_requests'] = [
    { id: 'tr-1', transfer_number: 'TR-0001', asset_ids: ['a-8'], from_location_id: 'loc-4', to_location_id: 'loc-8', from_department_id: 'dep-internal', to_department_id: 'dep-sleep', reason: 'إعادة توزيع الأسرّة', proposed_date: daysAgo(7), sent_by: 'u-ed', status: 'pending_approval', created_at: daysAgo(7) },
  ]

  const contracts: Database['contracts'] = [
    { id: 'ct-1', contract_number: 'CT-2024-01', supplier_id: 'sup-3', type_ar: 'عقد صيانة سنوي', type_en: 'Annual Maintenance', start_date: daysAgo(200), end_date: daysFromNow(165), value: 120000, scope: 'أجهزة الأشعة', asset_ids: ['a-5'], contact: 'خالد فهد', notes: '' },
    { id: 'ct-2', contract_number: 'CT-2024-02', supplier_id: 'sup-4', type_ar: 'عقد معايرة', type_en: 'Calibration Contract', start_date: daysAgo(150), end_date: daysFromNow(215), value: 60000, scope: 'أجهزة المختبر', asset_ids: ['a-6'], contact: 'سارة ناصر', notes: '' },
  ]

  const warranties: Database['warranties'] = [
    { id: 'wr-1', asset_id: 'a-2', supplier_id: 'sup-1', warranty_number: 'WR-HAM-C6', start_date: daysAgo(700), end_date: daysFromNow(120), terms: 'قطع وأعمال', contact: 'أحمد سالم' },
    { id: 'wr-2', asset_id: 'a-3', supplier_id: 'sup-2', warranty_number: 'WR-PH-MX450', start_date: daysAgo(500), end_date: daysFromNow(20), terms: 'قطع وأعمال', contact: 'منى العلي' },
    { id: 'wr-3', asset_id: 'a-6', supplier_id: 'sup-4', warranty_number: 'WR-SY-XN550', start_date: daysAgo(320), end_date: daysFromNow(210), terms: 'قطع وأعمال مع زيارة دورية', contact: 'سارة ناصر' },
  ]

  const movement_logs: Database['movement_logs'] = [
    { id: 'mv-1', asset_id: 'a-2', action_ar: 'تغيير حالة', action_en: 'Status change', details: 'active → in_maintenance', user_id: 'u-bio', at: daysAgo(2) },
    { id: 'mv-2', asset_id: 'a-10', action_ar: 'إبلاغ عن فقدان', action_en: 'Reported lost', details: 'لم يُعثر عليه بعد الجرد', user_id: 'u-ed', at: daysAgo(12) },
    { id: 'mv-3', asset_id: 'a-12', action_ar: 'إنشاء أصل', action_en: 'Asset created', details: 'استيراد أولي', user_id: 'u-am', at: daysAgo(5) },
  ]

  const notifications: Database['notifications'] = [
    { id: 'nt-1', type_ar: 'ضمان ينتهي قريبًا', type_en: 'Warranty expiring soon', message_ar: 'ضمان الجهاز AST-0003 ينتهي خلال 20 يومًا', message_en: 'Warranty for AST-0003 expires in 20 days', link: '/assets/a-3', severity: 'warning', user_id: 'all', at: daysAgo(1), read: false },
    { id: 'nt-2', type_ar: 'معايرة مستحقة قريبًا', type_en: 'Calibration due soon', message_ar: 'معايرة AST-0006 مستحقة خلال 3 أيام', message_en: 'Calibration for AST-0006 is due in 3 days', link: '/calibration', severity: 'warning', user_id: 'all', at: daysAgo(1), read: false },
    { id: 'nt-3', type_ar: 'طلب صيانة عالي الأولوية', type_en: 'High priority maintenance request', message_ar: 'طلب صيانة MR-0001 أولوية حرجة', message_en: 'Maintenance request MR-0001 is critical', link: '/maintenance/mr-1', severity: 'danger', user_id: 'all', at: daysAgo(3), read: false },
    { id: 'nt-4', type_ar: 'أصل مفقود', type_en: 'Lost asset', message_ar: 'الأصل AST-0010 مسجل كمفقود', message_en: 'Asset AST-0010 is marked as lost', link: '/assets/missing', severity: 'danger', user_id: 'all', at: daysAgo(12), read: true },
  ]

  const audit_logs: Database['audit_logs'] = [
    { id: 'al-1', user_id: 'u-bio', action_ar: 'تغيير حالة أصل', action_en: 'Asset status change', entity_type: 'asset', entity_id: 'a-2', old_value: 'active', new_value: 'in_maintenance', at: daysAgo(2), ip: '10.0.4.11' },
    { id: 'al-2', user_id: 'u-am', action_ar: 'إنشاء أصل', action_en: 'Asset created', entity_type: 'asset', entity_id: 'a-12', at: daysAgo(5), ip: '10.0.4.08' },
    { id: 'al-3', user_id: 'u-admin', action_ar: 'تسجيل دخول', action_en: 'Login', entity_type: 'session', at: daysAgo(1), ip: '10.0.4.02' },
  ]

  return {
    users, roles, departments, locations, categories, assets, suppliers, contracts, warranties,
    maintenance_requests, work_orders, maintenance_plans, calibration_records, transfer_requests,
    movement_logs, notifications, audit_logs,
    settings: {
      calibration_reminders: [90, 30, 7, 0],
      session_timeout_minutes: 30,
      hospital_name_ar: 'المستشفى',
      hospital_name_en: 'The Hospital',
    },
  }
}
