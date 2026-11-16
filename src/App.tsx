import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpDown,
  AtSign,
  Download,
  FileUp,
  LayoutGrid,
  Plus,
  Search,
  SearchX,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import type { Contact, ContactDraft, ImportMode, ImportPreview, ViewMode } from './types'
import { collectTagCounts, filterContacts, mergeImportedContacts, uid } from './lib/contacts'
import { downloadContactTemplate, downloadContactsExcel } from './lib/excel'
import { loadContacts, saveContacts } from './lib/storage'
import { Sidebar } from './components/Sidebar'
import { ContactCard } from './components/ContactCard'
import { ContactDetail } from './components/ContactDetail'
import { ContactForm } from './components/ContactForm'
import { ImportDialog } from './components/ImportDialog'
import { GuideDialog } from './components/GuideDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ToastStack, type ToastItem } from './components/Toast'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function monthKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${date.getMonth()}`
}

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts())
  const [view, setView] = useState<ViewMode>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'updated' | 'name'>('updated')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [exporting, setExporting] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveContacts(contacts)
  }, [contacts])

  const showToast = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = uid('toast')
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3800)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const favoriteCount = useMemo(() => contacts.filter((contact) => contact.favorite).length, [contacts])
  const tags = useMemo(() => collectTagCounts(contacts), [contacts])
  const methodCount = useMemo(
    () => contacts.reduce((total, contact) => total + contact.methods.length, 0),
    [contacts],
  )
  const thisMonth = useMemo(() => {
    const current = monthKey(new Date().toISOString())
    return contacts.filter((contact) => monthKey(contact.createdAt) === current).length
  }, [contacts])

  const filteredContacts = useMemo(
    () =>
      filterContacts(contacts, {
        query,
        favoriteOnly: view === 'favorites',
        tag: selectedTag,
        sort,
      }),
    [contacts, query, view, selectedTag, sort],
  )

  const selectedContact = detailId ? contacts.find((contact) => contact.id === detailId) ?? null : null
  const editingContact = editingId ? contacts.find((contact) => contact.id === editingId) ?? null : null
  const existingTags = useMemo(() => tags.map((item) => item.tag), [tags])

  const changeView = (next: ViewMode) => {
    setView(next)
    setSelectedTag(null)
  }

  const changeTag = (tag: string | null) => {
    setSelectedTag(tag)
    if (tag) setView('all')
  }

  const clearFilters = () => {
    setQuery('')
    setSelectedTag(null)
    setView('all')
  }

  const openNewContact = () => {
    setDetailId(null)
    setEditingId(null)
    setFormOpen(true)
  }

  const openEditContact = () => {
    if (!selectedContact) return
    setEditingId(selectedContact.id)
    setDetailId(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
  }

  const handleSave = (draft: ContactDraft) => {
    const now = new Date().toISOString()
    if (editingId) {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === editingId
            ? {
                ...contact,
                ...draft,
                updatedAt: now,
              }
            : contact,
        ),
      )
      showToast(`已更新「${draft.name}」的资料`)
    } else {
      const contact: Contact = {
        ...draft,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      }
      setContacts((current) => [contact, ...current])
      setView('all')
      setSelectedTag(null)
      setQuery('')
      showToast(`已添加「${draft.name}」到通讯录`)
    }
    closeForm()
  }

  const toggleFavorite = (id: string) => {
    const target = contacts.find((contact) => contact.id === id)
    if (!target) return
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, favorite: !contact.favorite } : contact,
      ),
    )
    showToast(target.favorite ? `已取消收藏「${target.name}」` : `已收藏「${target.name}」`, 'info')
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setContacts((current) => current.filter((contact) => contact.id !== deleteTarget.id))
    setDetailId(null)
    showToast(`已删除「${deleteTarget.name}」`, 'info')
    setDeleteTarget(null)
  }

  const handleImport = (incoming: ImportPreview['contacts'], mode: ImportMode) => {
    const result = mergeImportedContacts(contacts, incoming, mode)
    setContacts(result.contacts)
    setView('all')
    setSelectedTag(null)
    setQuery('')
    if (mode === 'merge') {
      showToast(`导入完成：新增 ${result.stats.added} 位，合并 ${result.stats.merged} 位`)
    } else {
      showToast(`导入完成：已追加 ${result.stats.added} 位联系人`)
    }
  }

  const handleExport = async () => {
    if (!contacts.length) {
      showToast('通讯录为空，暂时没有可导出的联系人', 'error')
      return
    }
    setExporting(true)
    try {
      await downloadContactsExcel(contacts)
      showToast(`已导出 ${contacts.length} 位联系人的 Excel 表格`)
    } catch {
      showToast('导出失败，请稍后重试。', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleTemplate = async () => {
    try {
      await downloadContactTemplate()
      showToast('导入模板已开始下载', 'info')
    } catch {
      showToast('模板生成失败，请稍后重试。', 'error')
    }
  }

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast(`已复制${label}：${value}`)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      showToast(copied ? `已复制${label}：${value}` : '复制失败，请手动选择文本', copied ? 'success' : 'error')
    }
  }

  const filterTitle =
    view === 'favorites' ? '我的收藏' : selectedTag ? `标签 · ${selectedTag}` : '全部联系人'
  const isFiltered = Boolean(query.trim()) || Boolean(selectedTag) || view === 'favorites'

  return (
    <>
      <div className="app-shell">
        <Sidebar
          contactCount={contacts.length}
          favoriteCount={favoriteCount}
          tags={tags}
          view={view}
          selectedTag={selectedTag}
          onViewChange={changeView}
          onTagChange={changeTag}
          onImport={() => setImportOpen(true)}
          onExport={() => void handleExport()}
          onGuide={() => setGuideOpen(true)}
        />

        <main className="main">
          <header className="topbar">
            <div className="mobile-brand">
              <span className="brand-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <strong>拾光</strong>
            </div>
            <div className="topbar-title">
              <p className="eyebrow">PERSONAL ADDRESS BOOK</p>
              <h1>
                {greeting()}，<span>今天想联系谁？</span>
              </h1>
            </div>
            <div className="topbar-actions">
              <label className="searchbox">
                <Search size={18} />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索姓名、电话、邮箱或标签…"
                  aria-label="搜索联系人"
                />
                {query ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                    aria-label="清空搜索"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd>Ctrl K</kbd>
                )}
              </label>
              <div className="topbar-quick">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setImportOpen(true)}
                  aria-label="导入 Excel"
                  title="导入 Excel"
                >
                  <FileUp size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => void handleExport()}
                  aria-label="导出 Excel"
                  title="导出 Excel"
                  disabled={exporting}
                >
                  <Download size={18} />
                </button>
              </div>
              <button type="button" className="btn btn-primary add-btn" onClick={openNewContact}>
                <Plus size={18} /> 新建联系人
              </button>
            </div>
          </header>

          <div className="main-inner">
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-copy">
                <p className="eyebrow">YOUR PEOPLE, IN ONE PLACE</p>
                <h2 id="hero-title">
                  把重要的人，
                  <br />
                  <em>放在触手可及的地方。</em>
                </h2>
                <p className="hero-description">
                  收藏常用联系人，记录多种联系方式，需要时导出为一份清晰的 Excel。
                </p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-cream" onClick={openNewContact}>
                    <Plus size={16} /> 新建联系人
                  </button>
                  <button type="button" className="btn btn-hero-ghost" onClick={() => setImportOpen(true)}>
                    <FileUp size={16} /> 导入 Excel
                  </button>
                </div>
              </div>
              <div className="hero-side">
                <div className="hero-stat">
                  <span className="hero-stat-icon">
                    <Users size={18} />
                  </span>
                  <strong>{contacts.length}</strong>
                  <p>位联系人</p>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-icon">
                    <Star size={18} />
                  </span>
                  <strong>{favoriteCount}</strong>
                  <p>位收藏</p>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-icon">
                    <AtSign size={18} />
                  </span>
                  <strong>{methodCount}</strong>
                  <p>条联系方式</p>
                </div>
                <span className="hero-ring hero-ring-one" aria-hidden="true" />
                <span className="hero-ring hero-ring-two" aria-hidden="true" />
                <span className="hero-orbit" aria-hidden="true">
                  <Sparkles size={16} />
                </span>
              </div>
            </section>

            <section className="directory" aria-labelledby="directory-title">
              <div className="directory-head">
                <div>
                  <p className="eyebrow">
                    {view === 'favorites' ? 'FAVORITES' : selectedTag ? 'TAGGED CONTACTS' : 'ALL CONTACTS'}
                  </p>
                  <h2 id="directory-title">{filterTitle}</h2>
                  <p className="directory-sub">
                    {query.trim()
                      ? `“${query.trim()}” 的搜索结果`
                      : `${filteredContacts.length} 位联系人${thisMonth ? ` · 本月新增 ${thisMonth} 位` : ''}`}
                  </p>
                </div>
                <div className="directory-tools">
                  {selectedTag ? (
                    <button type="button" className="filter-chip" onClick={() => setSelectedTag(null)}>
                      <span># {selectedTag}</span>
                      <X size={13} />
                    </button>
                  ) : null}
                  {isFiltered ? (
                    <button type="button" className="text-btn quiet" onClick={clearFilters}>
                      重置筛选
                    </button>
                  ) : null}
                  <label className="sort-control">
                    <ArrowUpDown size={15} />
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as 'updated' | 'name')}
                      aria-label="排序方式"
                    >
                      <option value="updated">最近更新</option>
                      <option value="name">按姓名 A–Z</option>
                    </select>
                  </label>
                </div>
              </div>

              {filteredContacts.length ? (
                <div className="contacts-grid">
                  {filteredContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onOpen={setDetailId}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                  <button type="button" className="add-card" onClick={openNewContact}>
                    <span>
                      <Plus size={22} />
                    </span>
                    <strong>添加一位联系人</strong>
                    <span className="add-card-sub">把新的相遇，收进通讯录</span>
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-illustration">
                    {query || selectedTag || view === 'favorites' ? <SearchX size={34} /> : <Users size={34} />}
                  </div>
                  <h3>
                    {query || selectedTag || view === 'favorites' ? '没有找到匹配的联系人' : '通讯录还是空的'}
                  </h3>
                  <p>
                    {query || selectedTag || view === 'favorites'
                      ? '换一个关键词或标签试试，也可以重置筛选查看全部联系人。'
                      : '新建第一位联系人，或从 Excel 导入已有的通讯录。'}
                  </p>
                  <div className="empty-actions">
                    {query || selectedTag || view === 'favorites' ? (
                      <button type="button" className="btn btn-primary" onClick={clearFilters}>
                        查看全部联系人
                      </button>
                    ) : (
                      <>
                        <button type="button" className="btn btn-primary" onClick={openNewContact}>
                          <Plus size={16} /> 新建联系人
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
                          <FileUp size={16} /> 导入 Excel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            <footer className="app-footer">
              <span>拾光通讯录 · Luma Contacts</span>
              <span>软件工程课程项目 · 数据仅保存在本机浏览器</span>
            </footer>
          </div>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="移动端快捷导航">
        <button
          type="button"
          className={view === 'all' && !selectedTag ? 'is-active' : ''}
          onClick={() => changeView('all')}
        >
          <LayoutGrid size={20} />
          <span>全部</span>
        </button>
        <button
          type="button"
          className={view === 'favorites' ? 'is-active' : ''}
          onClick={() => changeView('favorites')}
        >
          <Star size={20} />
          <span>收藏</span>
        </button>
        <button type="button" onClick={() => setImportOpen(true)}>
          <FileUp size={20} />
          <span>导入</span>
        </button>
        <button type="button" onClick={() => void handleExport()}>
          <Download size={20} />
          <span>导出</span>
        </button>
        <button type="button" className="mobile-add" onClick={openNewContact}>
          <Plus size={22} />
          <span>新建</span>
        </button>
      </nav>

      {selectedContact ? (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setDetailId(null)}
          onEdit={openEditContact}
          onDelete={() => {
            const target = selectedContact
            setDetailId(null)
            setDeleteTarget(target)
          }}
          onToggleFavorite={() => toggleFavorite(selectedContact.id)}
          onCopy={(value, label) => void copyValue(value, label)}
        />
      ) : null}

      <ContactForm
        open={formOpen}
        contact={editingContact}
        existingTags={existingTags}
        onClose={closeForm}
        onSave={handleSave}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={() => void handleTemplate()}
      />

      <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这位联系人？"
        message={
          deleteTarget
            ? `「${deleteTarget.name}」及其全部联系方式将从通讯录中移除，此操作无法撤销。`
            : ''
        }
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ToastStack
        items={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
    </>
  )
}
