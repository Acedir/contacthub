import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Copy, Pencil, Star, Trash2, X } from 'lucide-react'
import type { Contact } from '../types'
import { METHOD_KINDS, METHOD_LABELS } from '../types'
import { formatFullDate, relativeUpdated } from '../lib/contacts'
import { Avatar } from './Avatar'
import { MethodIcon } from './MethodIcon'

interface ContactDetailProps {
  contact: Contact
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onCopy: (value: string, label: string) => void
}

export function ContactDetail({
  contact,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: ContactDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return createPortal(
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${contact.name} 的联系人详情`}>
        <div className="detail-hero">
          <div className="detail-hero-top">
            <span className="detail-kicker">
              {contact.favorite ? '★ PINNED CONTACT' : 'CONTACT PROFILE'}
            </span>
            <button ref={closeRef} type="button" className="icon-btn icon-btn-light" onClick={onClose} aria-label="关闭详情">
              <X size={20} />
            </button>
          </div>
          <Avatar name={contact.name} size="xl" />
          <div className="detail-title-row">
            <div>
              <h2>{contact.name}</h2>
              <p>{[contact.title, contact.company].filter(Boolean).join(' · ') || '暂未填写公司信息'}</p>
            </div>
            <button
              type="button"
              className={`detail-star ${contact.favorite ? 'is-on' : ''}`}
              onClick={onToggleFavorite}
              aria-label={contact.favorite ? '取消收藏' : '收藏联系人'}
              aria-pressed={contact.favorite}
            >
              <Star size={21} fill={contact.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="detail-actions">
            <button type="button" className="btn btn-light" onClick={onEdit}>
              <Pencil size={15} /> 编辑资料
            </button>
            <button type="button" className="btn btn-ghost-danger" onClick={onDelete}>
              <Trash2 size={15} /> 删除
            </button>
          </div>
        </div>

        <div className="detail-body">
          <section className="detail-section">
            <div className="detail-section-head">
              <h3>联系方式</h3>
              <span>{contact.methods.length} 条</span>
            </div>
            {contact.methods.length ? (
              <div className="detail-method-groups">
                {METHOD_KINDS.map((kind) => {
                  const methods = contact.methods.filter((method) => method.kind === kind)
                  if (!methods.length) return null
                  return (
                    <div className="detail-method-group" key={kind}>
                      <p className="detail-method-kind">
                        <span className={`method-icon method-${kind}`}>
                          <MethodIcon kind={kind} size={14} />
                        </span>
                        {METHOD_LABELS[kind]}
                      </p>
                      {methods.map((method) => (
                        <button
                          type="button"
                          className="detail-method"
                          key={method.id}
                          onClick={() => onCopy(method.value, method.label || METHOD_LABELS[kind])}
                          title={`复制 ${method.value}`}
                        >
                          <span className="detail-method-label">{method.label || METHOD_LABELS[kind]}</span>
                          <span className="detail-method-value">{method.value}</span>
                          <Copy size={14} className="copy-icon" />
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="detail-empty">尚未添加联系方式，点击“编辑资料”补充。</p>
            )}
          </section>

          {contact.tags.length ? (
            <section className="detail-section">
              <div className="detail-section-head">
                <h3>标签</h3>
              </div>
              <div className="detail-tags">
                {contact.tags.map((tag) => (
                  <span className="tag-chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail-section">
            <div className="detail-section-head">
              <h3>备注</h3>
            </div>
            {contact.notes ? (
              <p className="detail-notes">{contact.notes}</p>
            ) : (
              <p className="detail-empty">还没有备注。</p>
            )}
          </section>

          <section className="detail-section detail-meta">
            <p>
              <CalendarDays size={14} /> 生日：{contact.birthday ? formatFullDate(contact.birthday) : '未填写'}
            </p>
            <p>
              创建于 {formatFullDate(contact.createdAt)} · 更新于 {relativeUpdated(contact.updatedAt)}
            </p>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
