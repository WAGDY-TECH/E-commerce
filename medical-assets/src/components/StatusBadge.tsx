import { useI18n } from '../i18n'

const COLOR: Record<string, Record<string, string>> = {
  asset: {
    draft: 'gray', active: 'green', available: 'blue', in_use: 'blue',
    in_transfer: 'blue', in_maintenance: 'amber', temporarily_stopped: 'amber',
    lost: 'red', stolen: 'red', out_of_service: 'red', sold_disposed: 'gray', archived: 'gray',
  },
  request: {
    new: 'blue', reviewed: 'blue', assigned: 'blue', in_progress: 'amber',
    waiting_part: 'amber', waiting_vendor: 'amber', completed: 'green',
    closed: 'gray', rejected: 'red', cancelled: 'gray',
  },
  calibration: {
    pass: 'green', pass_with_notes: 'amber', fail: 'red',
    needs_repair_before_recalibration: 'red', not_required: 'gray',
  },
  transfer: {
    pending_approval: 'amber', approved: 'blue', rejected: 'red',
    handed_over: 'blue', received: 'green', cancelled: 'gray',
  },
  priority: { low: 'gray', medium: 'blue', high: 'amber', critical: 'red' },
}

const KEY: Record<string, string> = {
  asset: 'assets.status', request: 'maint.status', calibration: 'cal.result',
  transfer: 'tr.status', priority: 'maint.priority',
}

export function StatusBadge({ kind, value }: { kind: keyof typeof COLOR; value: string }) {
  const { t } = useI18n()
  const cls = COLOR[kind]?.[value] ?? 'gray'
  return <span className={`badge ${cls}`}>{t(`${KEY[kind]}.${value}`)}</span>
}
