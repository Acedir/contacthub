import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认删除',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="PLEASE CONFIRM"
      title={title}
      size="sm"
      className="confirm-modal"
      footer={
        <div className="footer-actions footer-actions-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="confirm-body">
        <span className="confirm-icon">
          <AlertTriangle size={24} />
        </span>
        <p>{message}</p>
      </div>
    </Modal>
  )
}
