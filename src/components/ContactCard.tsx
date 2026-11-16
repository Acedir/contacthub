import { Star } from 'lucide-react'
import type { Contact } from '../types'
import { relativeUpdated } from '../lib/contacts'
import { Avatar } from './Avatar'
import { MethodIcon } from './MethodIcon'

interface ContactCardProps {
  contact: Contact
  onOpen: (id: string) => void
  onToggleFavorite: (id: string) => void
}

export function ContactCard({ contact, onOpen, onToggleFavorite }: ContactCardProps) {
  const visibleMethods = contact.methods.slice(0, 3)

  return (
    <article
      className={`contact-card ${contact.favorite ? 'is-favorite' : ''}`}
      role="button"
      tabIndex={0}
      data-testid={`contact-card-${contact.id}`}
      data-contact-name={contact.name}
      onClick={() => onOpen(contact.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(contact.id)
        }
      }}
      aria-label={`查看 ${contact.name} 的联系人详情`}
    >
      <div className="card-head">
        <Avatar name={contact.name} size="lg" />
        <div className="card-identity">
          <h3>{contact.name}</h3>
          <p>
            {[contact.title, contact.company].filter(Boolean).join(' · ') || '暂未填写公司信息'}
          </p>
        </div>
        <button
          type="button"
          className={`star-btn ${contact.favorite ? 'is-on' : ''}`}
          aria-label={contact.favorite ? `取消收藏 ${contact.name}` : `收藏 ${contact.name}`}
          aria-pressed={contact.favorite}
          title={contact.favorite ? '取消收藏' : '收藏联系人'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite(contact.id)
          }}
        >
          <Star size={18} fill={contact.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="card-methods">
        {visibleMethods.length ? (
          visibleMethods.map((method) => (
            <div className="card-method" key={method.id}>
              <span className={`method-icon method-${method.kind}`}>
                <MethodIcon kind={method.kind} size={14} />
              </span>
              <span className="method-value">{method.value}</span>
              {method.label ? <span className="method-label">{method.label}</span> : null}
            </div>
          ))
        ) : (
          <p className="no-methods">尚未添加联系方式</p>
        )}
        {contact.methods.length > 3 ? (
          <span className="more-methods">还有 {contact.methods.length - 3} 条方式</span>
        ) : null}
      </div>

      <div className="card-foot">
        <div className="card-tags">
          {contact.tags.slice(0, 2).map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
          {contact.tags.length > 2 ? <span className="tag-more">+{contact.tags.length - 2}</span> : null}
          {!contact.tags.length ? <span className="tag-empty">无标签</span> : null}
        </div>
        <span className="updated-at">{relativeUpdated(contact.updatedAt)}</span>
      </div>
    </article>
  )
}
