export const METHOD_KINDS = ['phone', 'email', 'address', 'social'] as const

export type MethodKind = (typeof METHOD_KINDS)[number]

export type ViewMode = 'all' | 'favorites'

export interface ContactMethod {
  id: string
  kind: MethodKind
  label: string
  value: string
}

export interface Contact {
  id: string
  name: string
  company: string
  title: string
  birthday: string
  favorite: boolean
  methods: ContactMethod[]
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export type ContactDraft = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>

export type ImportMode = 'merge' | 'append'

export interface ImportPreview {
  contacts: ContactDraft[]
  totalRows: number
  skippedRows: number
  warnings: string[]
  fileName?: string
}

export interface MergeStats {
  added: number
  merged: number
  total: number
}

export interface ContactFilters {
  query: string
  favoriteOnly: boolean
  tag: string | null
  sort: 'updated' | 'name'
}

export const METHOD_LABELS: Record<MethodKind, string> = {
  phone: '电话',
  email: '邮箱',
  address: '地址',
  social: '社交',
}

export const METHOD_PLACEHOLDERS: Record<MethodKind, { label: string; value: string }> = {
  phone: { label: '手机 / 工作 / 家庭', value: '138 0000 0000' },
  email: { label: '个人 / 工作', value: 'name@example.com' },
  address: { label: '家庭 / 公司', value: '上海市静安区……' },
  social: { label: '微信 / 微博 / LinkedIn', value: '微信号或主页链接' },
}

export const METHOD_DEFAULT_LABEL: Record<MethodKind, string> = {
  phone: '手机',
  email: '邮箱',
  address: '地址',
  social: '微信',
}
