import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastStack({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {items.map((toast) => {
        const Icon = ICONS[toast.tone]
        return (
          <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
            <Icon size={18} />
            <span>{toast.message}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="关闭提示">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
