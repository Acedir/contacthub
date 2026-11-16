import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Building2,
  Briefcase,
  Plus,
  Star,
  StickyNote,
  Tag,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { Contact, ContactDraft, ContactMethod, MethodKind } from '../types'
import { METHOD_DEFAULT_LABEL, METHOD_KINDS, METHOD_LABELS, METHOD_PLACEHOLDERS } from '../types'
import { createMethod, parseTags, sanitizeMethods } from '../lib/contacts'
import { Modal } from './Modal'
import { MethodIcon } from './MethodIcon'

interface ContactFormProps {
  open: boolean
  contact: Contact | null
  existingTags: string[]
  onClose: () => void
  onSave: (draft: ContactDraft) => void
}

interface FormState {
  name: string
  company: string
  title: string
  birthday: string
  favorite: boolean
  methods: ContactMethod[]
  tagsText: string
  notes: string
}

function initialForm(contact: Contact | null): FormState {
  if (contact) {
    return {
      name: contact.name,
      company: contact.company,
      title: contact.title,
      birthday: contact.birthday,
      favorite: contact.favorite,
      methods: contact.methods.map((method) => ({ ...method })),
      tagsText: contact.tags.join('，'),
      notes: contact.notes,
    }
  }
  return {
    name: '',
    company: '',
    title: '',
    birthday: '',
    favorite: false,
    methods: [createMethod('phone', '手机')],
    tagsText: '',
    notes: '',
  }
}

export function ContactForm({ open, contact, existingTags, onClose, onSave }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(contact))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(initialForm(contact))
    setErrors({})
  }, [open, contact])

  const addMethod = (kind: MethodKind) => {
    setForm((current) => ({
      ...current,
      methods: [...current.methods, createMethod(kind, METHOD_DEFAULT_LABEL[kind])],
    }))
  }

  const removeMethod = (id: string) => {
    setForm((current) => ({
      ...current,
      methods: current.methods.filter((method) => method.id !== id),
    }))
  }

  const updateMethod = (id: string, patch: Partial<ContactMethod>) => {
    setForm((current) => ({
      ...current,
      methods: current.methods.map((method) => (method.id === id ? { ...method, ...patch } : method)),
    }))
  }

  const toggleTag = (tag: string) => {
    const selected = parseTags(form.tagsText)
    const next = selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag]
    setForm((current) => ({ ...current, tagsText: next.join('，') }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setErrors({ name: '请填写联系人姓名。' })
      return
    }
    setErrors({})
    onSave({
      name,
      company: form.company.trim(),
      title: form.title.trim(),
      birthday: form.birthday,
      favorite: form.favorite,
      methods: sanitizeMethods(form.methods),
      tags: parseTags(form.tagsText),
      notes: form.notes.trim(),
    })
  }

  const selectedTags = parseTags(form.tagsText)

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={contact ? 'EDIT CONTACT' : 'NEW CONTACT'}
      title={contact ? '编辑联系人' : '新建联系人'}
      size="lg"
      className="contact-form-modal"
      footer={
        <>
          <p className="footer-hint">
            <Star size={13} /> 星标联系人会出现在“我的收藏”中
          </p>
          <div className="footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" form="contact-form" className="btn btn-primary">
              {contact ? '保存修改' : '添加联系人'}
            </button>
          </div>
        </>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-section">
          <div className="form-section-title">
            <span className="form-step">01</span>
            <div>
              <h3>基本信息</h3>
              <p>先记下对方是谁，之后随时可以补充。</p>
            </div>
          </div>
          <div className="form-grid">
            <label className={`field ${errors.name ? 'has-error' : ''}`}>
              <span>
                <UserRound size={14} /> 姓名 <b>*</b>
              </span>
              <input
                data-autofocus
                data-testid="contact-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：林知夏"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                aria-label="姓名"
              />
              {errors.name ? <em>{errors.name}</em> : null}
            </label>
            <label className="field">
              <span>
                <Building2 size={14} /> 公司 / 组织
              </span>
              <input
                type="text"
                value={form.company}
                onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                placeholder="例如：木棉设计"
                aria-label="公司"
              />
            </label>
            <label className="field">
              <span>
                <Briefcase size={14} /> 职位
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="例如：产品设计师"
                aria-label="职位"
              />
            </label>
            <label className="field">
              <span>
                <CalendarDays size={14} /> 生日
              </span>
              <input
                type="date"
                value={form.birthday}
                onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))}
                aria-label="生日"
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">
            <span className="form-step">02</span>
            <div>
              <h3>联系方式</h3>
              <p>同一种联系方式可以添加多条，并按用途标注。</p>
            </div>
          </div>
          <div className="method-editor">
            {METHOD_KINDS.map((kind) => {
              const methods = form.methods.filter((method) => method.kind === kind)
              return (
                <div className="method-editor-group" key={kind}>
                  <div className="method-editor-head">
                    <span className={`method-icon method-${kind}`}>
                      <MethodIcon kind={kind} size={15} />
                    </span>
                    <strong>{METHOD_LABELS[kind]}</strong>
                    <span className="method-count">{methods.length}</span>
                    <button type="button" className="text-btn" onClick={() => addMethod(kind)}>
                      <Plus size={14} /> 添加
                    </button>
                  </div>
                  {methods.length ? (
                    <div className="method-rows">
                      {methods.map((method) => (
                        <div className="method-row" key={method.id}>
                          <input
                            className="method-label-input"
                            type="text"
                            value={method.label}
                            onChange={(event) => updateMethod(method.id, { label: event.target.value })}
                            placeholder={METHOD_PLACEHOLDERS[kind].label}
                            aria-label={`${METHOD_LABELS[kind]}标签`}
                          />
                          <input
                            className="method-value-input"
                            type="text"
                            value={method.value}
                            onChange={(event) => updateMethod(method.id, { value: event.target.value })}
                            placeholder={METHOD_PLACEHOLDERS[kind].value}
                            aria-label={`${METHOD_LABELS[kind]}内容`}
                          />
                          <button
                            type="button"
                            className="method-remove"
                            onClick={() => removeMethod(method.id)}
                            aria-label={`删除这条${METHOD_LABELS[kind]}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button type="button" className="empty-method-row" onClick={() => addMethod(kind)}>
                      <Plus size={14} /> 添加一个{METHOD_LABELS[kind]}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">
            <span className="form-step">03</span>
            <div>
              <h3>整理与备注</h3>
              <p>用标签归档，留下只有你懂的上下文。</p>
            </div>
          </div>
          <div className="form-grid form-grid-single">
            <label className="field">
              <span>
                <Tag size={14} /> 标签
              </span>
              <input
                type="text"
                value={form.tagsText}
                onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))}
                placeholder="用逗号分隔，例如：朋友，设计"
                aria-label="标签"
              />
            </label>
            {existingTags.length ? (
              <div className="tag-suggestions">
                <span>已有标签</span>
                {existingTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-suggestion ${selectedTags.includes(tag) ? 'is-selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="field">
              <span>
                <StickyNote size={14} /> 备注
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="例如：喜欢的咖啡、约定的沟通方式、上次见面的时间……"
                rows={3}
                aria-label="备注"
              />
            </label>
            <button
              type="button"
              className={`favorite-toggle ${form.favorite ? 'is-on' : ''}`}
              onClick={() => setForm((current) => ({ ...current, favorite: !current.favorite }))}
              aria-pressed={form.favorite}
            >
              <span className="favorite-toggle-icon">
                <Star size={17} fill={form.favorite ? 'currentColor' : 'none'} />
              </span>
              <span>
                <strong>{form.favorite ? '已加入收藏' : '收藏这位联系人'}</strong>
                <small>重要的人会优先出现在「我的收藏」中</small>
              </span>
              <span className="switch" aria-hidden="true">
                <span />
              </span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
