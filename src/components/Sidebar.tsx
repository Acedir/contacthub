import {
  Download,
  FileUp,
  HelpCircle,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Users,
} from 'lucide-react'
import type { ViewMode } from '../types'

interface SidebarProps {
  contactCount: number
  favoriteCount: number
  tags: Array<{ tag: string; count: number }>
  view: ViewMode
  selectedTag: string | null
  onViewChange: (view: ViewMode) => void
  onTagChange: (tag: string | null) => void
  onImport: () => void
  onExport: () => void
  onGuide: () => void
}

export function Sidebar({
  contactCount,
  favoriteCount,
  tags,
  view,
  selectedTag,
  onViewChange,
  onTagChange,
  onImport,
  onExport,
  onGuide,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <button
        type="button"
        className="brand"
        onClick={() => {
          onViewChange('all')
          onTagChange(null)
        }}
        aria-label="返回全部联系人"
      >
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="brand-copy">
          <strong>拾光</strong>
          <small>LUMA CONTACTS</small>
        </span>
      </button>

      <div className="sidebar-intro">
        <Sparkles size={14} />
        <span>把重要的人，放在触手可及的地方。</span>
      </div>

      <nav className="side-nav" aria-label="通讯录分类">
        <p className="side-label">通讯录</p>
        <button
          type="button"
          className={`side-link ${view === 'all' && !selectedTag ? 'is-active' : ''}`}
          onClick={() => {
            onViewChange('all')
            onTagChange(null)
          }}
        >
          <LayoutGrid size={18} />
          <span>全部联系人</span>
          <b>{contactCount}</b>
        </button>
        <button
          type="button"
          className={`side-link ${view === 'favorites' ? 'is-active' : ''}`}
          onClick={() => {
            onViewChange('favorites')
            onTagChange(null)
          }}
        >
          <Star size={18} />
          <span>我的收藏</span>
          <b>{favoriteCount}</b>
        </button>
      </nav>

      <nav className="side-tags" aria-label="按标签筛选">
        <div className="side-label-row">
          <p className="side-label">
            <Tag size={13} /> 标签
          </p>
          <span>{tags.length}</span>
        </div>
        {tags.length ? (
          <div className="tag-nav-list">
            {tags.slice(0, 9).map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className={`tag-nav ${selectedTag === tag ? 'is-active' : ''}`}
                onClick={() => onTagChange(selectedTag === tag ? null : tag)}
              >
                <span>{tag}</span>
                <b>{count}</b>
              </button>
            ))}
          </div>
        ) : (
          <p className="side-empty">新建联系人时添加标签，即可在这里快速筛选。</p>
        )}
      </nav>

      <div className="side-actions">
        <p className="side-label">快捷操作</p>
        <button type="button" className="side-action" onClick={onImport}>
          <FileUp size={17} />
          <span>从 Excel 导入</span>
        </button>
        <button type="button" className="side-action" onClick={onExport}>
          <Download size={17} />
          <span>导出 Excel</span>
        </button>
        <button type="button" className="side-action" onClick={onGuide}>
          <HelpCircle size={17} />
          <span>使用说明与快捷键</span>
        </button>
      </div>

      <div className="side-foot">
        <div className="privacy-card">
          <ShieldCheck size={19} />
          <div>
            <strong>本地优先</strong>
            <p>数据仅保存在当前浏览器，不会上传服务器。</p>
          </div>
        </div>
        <div className="side-meta">
          <span>
            <Users size={13} /> 共 {contactCount} 人
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}
