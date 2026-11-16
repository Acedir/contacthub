import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Star,
  UploadCloud,
} from 'lucide-react'
import type { ImportMode, ImportPreview } from '../types'
import { parseContactsWorkbook } from '../lib/excel'
import { Modal } from './Modal'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (contacts: ImportPreview['contacts'], mode: ImportMode) => void
  onDownloadTemplate: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ImportDialog({ open, onClose, onImport, onDownloadTemplate }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setPreview(null)
    setMode('merge')
    setError(null)
    setLoading(false)
    setDragging(false)
  }, [open])

  const readFile = async (selected: File) => {
    setError(null)
    if (!/\.(xlsx|xlsm)$/i.test(selected.name)) {
      setError('目前支持 .xlsx / .xlsm 文件。若是 .xls 旧格式，请先在 Excel 中另存为 .xlsx。')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('文件超过 10 MB，请拆分后再导入。')
      return
    }

    setLoading(true)
    setFile(selected)
    setPreview(null)
    try {
      const buffer = await selected.arrayBuffer()
      const parsed = await parseContactsWorkbook(buffer, selected.name)
      setPreview(parsed)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '读取 Excel 失败，请检查文件是否损坏。')
    } finally {
      setLoading(false)
    }
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) void readFile(selected)
    event.target.value = ''
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setLoading(false)
    inputRef.current?.click()
  }

  const confirmImport = () => {
    if (!preview) return
    onImport(preview.contacts, mode)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="IMPORT FROM EXCEL"
      title={preview ? '确认导入内容' : '从 Excel 导入联系人'}
      size="lg"
      className="import-modal"
      footer={
        preview ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={reset}>
              <RotateCcw size={15} /> 重新选择
            </button>
            <div className="footer-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn btn-primary" data-testid="import-confirm" onClick={confirmImport}>
                <Check size={16} /> 导入 {preview.contacts.length} 位联系人
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="footer-hint">
              <Sparkles size={13} /> 导入前会先预览，不会直接修改现有数据
            </p>
            <div className="footer-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                取消
              </button>
            </div>
          </>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="visually-hidden"
        data-testid="import-file-input"
        onChange={handleInput}
      />

      {!preview ? (
        <div className="import-start">
          <div className="import-steps">
            <div>
              <span>1</span>
              <p>
                <strong>下载模板</strong>
                <small>表头已按联系方式分列</small>
              </p>
            </div>
            <ArrowRight size={15} />
            <div>
              <span>2</span>
              <p>
                <strong>填写联系人</strong>
                <small>每人一行，电话可多条</small>
              </p>
            </div>
            <ArrowRight size={15} />
            <div>
              <span>3</span>
              <p>
                <strong>上传预览</strong>
                <small>确认后写入通讯录</small>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="import-loading">
              <LoaderCircle size={30} className="spin" />
              <p>正在读取并校验表格…</p>
              <span>{file?.name}</span>
            </div>
          ) : (
            <div
              className={`dropzone ${dragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                const dropped = event.dataTransfer.files?.[0]
                if (dropped) void readFile(dropped)
              }}
            >
              <div className="dropzone-icon">
                <UploadCloud size={30} />
              </div>
              <h3>拖入 Excel 文件，或点击选择</h3>
              <p>支持 .xlsx / .xlsm，文件不超过 10 MB</p>
              <div className="dropzone-actions">
                <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
                  <FileUp size={16} /> 选择 Excel 文件
                </button>
                <button type="button" className="btn btn-secondary" onClick={onDownloadTemplate}>
                  <Download size={16} /> 下载导入模板
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="inline-alert inline-alert-error" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="import-format-note">
            <FileSpreadsheet size={17} />
            <div>
              <strong>表格格式</strong>
              <p>
                姓名、公司、职位、生日、收藏、标签、备注各占一列；电话、邮箱、地址、社交账号按“手机 1
                标签 / 手机 1”成对扩展。系统也兼容仅有「姓名、电话、邮箱」的简单表格。
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="import-preview">
          <div className="file-summary">
            <span className="file-summary-icon">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <strong>{file?.name}</strong>
              <span>
                {file ? formatBytes(file.size) : ''} · 已读取 {preview.totalRows} 行
              </span>
            </div>
            <button type="button" className="text-btn" onClick={reset}>
              <RotateCcw size={14} /> 更换文件
            </button>
          </div>

          <div className="import-metrics">
            <div>
              <strong>{preview.contacts.length}</strong>
              <span>可导入联系人</span>
            </div>
            <div>
              <strong>{preview.skippedRows}</strong>
              <span>缺少姓名 / 跳过</span>
            </div>
            <div>
              <strong>{preview.totalRows}</strong>
              <span>有效数据行</span>
            </div>
          </div>

          {preview.warnings.length ? (
            <details className="import-warnings">
              <summary>
                <AlertTriangle size={15} /> {preview.warnings.length} 条提示，点击查看
              </summary>
              <ul>
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>电话</th>
                  <th>邮箱</th>
                  <th>标签</th>
                  <th>收藏</th>
                </tr>
              </thead>
              <tbody>
                {preview.contacts.slice(0, 6).map((contact) => {
                  const phones = contact.methods.filter((method) => method.kind === 'phone')
                  const emails = contact.methods.filter((method) => method.kind === 'email')
                  return (
                    <tr key={`${contact.name}-${contact.methods[0]?.id ?? 'none'}`}>
                      <td>
                        <strong>{contact.name}</strong>
                      </td>
                      <td>
                        {phones.length ? (
                          <>
                            {phones[0].value}
                            {phones.length > 1 ? <small> +{phones.length - 1}</small> : null}
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {emails.length ? (
                          <>
                            {emails[0].value}
                            {emails.length > 1 ? <small> +{emails.length - 1}</small> : null}
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {contact.tags.length ? (
                          <span className="preview-tags">
                            {contact.tags.slice(0, 2).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {contact.favorite ? (
                          <Star size={16} className="star-on" fill="currentColor" />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {preview.contacts.length > 6 ? (
              <p className="preview-more">仅预览前 6 位，剩余 {preview.contacts.length - 6} 位也会一并导入。</p>
            ) : null}
          </div>

          <fieldset className="import-mode">
            <legend>导入方式</legend>
            <label className={mode === 'merge' ? 'is-selected' : ''}>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              <span className="mode-radio" />
              <span>
                <strong>
                  智能合并 <small>推荐</small>
                </strong>
                <span className="mode-description">
                  按姓名匹配已有联系人，补充缺少的联系方式、标签和备注，不会覆盖已有内容。
                </span>
              </span>
            </label>
            <label className={mode === 'append' ? 'is-selected' : ''}>
              <input
                type="radio"
                name="import-mode"
                value="append"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
              />
              <span className="mode-radio" />
              <span>
                <strong>全部追加</strong>
                <span className="mode-description">
                  把表格中的联系人全部作为新记录添加，即使姓名与现有联系人相同。
                </span>
              </span>
            </label>
          </fieldset>
        </div>
      )}
    </Modal>
  )
}
