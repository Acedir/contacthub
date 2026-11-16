import type { Contact, ContactDraft, ContactMethod, MethodKind } from '../types'

let methodSequence = 0

export function uid(prefix = 'c'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  methodSequence += 1
  return `${prefix}_${Date.now().toString(36)}_${methodSequence.toString(36)}`
}

export function createMethod(kind: MethodKind, label = '', value = ''): ContactMethod {
  return { id: uid('m'), kind, label, value }
}

export function normalizeMethodValue(kind: MethodKind, value: string): string {
  const trimmed = value.trim()
  if (kind === 'phone') return trimmed.replace(/[\s\-()（）]/g, '')
  if (kind === 'email' || kind === 'social') return trimmed.toLowerCase()
  return trimmed.replace(/\s+/g, ' ').toLowerCase()
}

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function sanitizeMethods(methods: ContactMethod[]): ContactMethod[] {
  const seen = new Set<string>()
  return methods
    .map((method) => ({ ...method, label: method.label.trim(), value: method.value.trim() }))
    .filter((method) => method.value.length > 0)
    .filter((method) => {
      const key = `${method.kind}:${normalizeMethodValue(method.kind, method.value)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,，;；、|\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12)
}

export function contactMatches(contact: Contact, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return true

  const haystack = [
    contact.name,
    contact.company,
    contact.title,
    contact.birthday,
    contact.notes,
    ...contact.tags,
    ...contact.methods.flatMap((method) => [method.label, method.value]),
  ]
    .join(' ')
    .toLocaleLowerCase()

  if (query.split(/\s+/).every((part) => haystack.includes(part))) return true

  // Phone numbers are commonly written with spaces, hyphens or brackets. Let a
  // compact query such as "1380000" still match "138 0000 1024".
  const compactHaystack = haystack.replace(/[\s\-()（）]/g, '')
  const compactQuery = query.replace(/[\s\-()（）]/g, '')
  return Boolean(compactQuery) && compactHaystack.includes(compactQuery)
}

export function filterContacts(contacts: Contact[], filters: {
  query: string
  favoriteOnly: boolean
  tag: string | null
  sort: 'updated' | 'name'
}): Contact[] {
  const filtered = contacts.filter((contact) => {
    if (filters.favoriteOnly && !contact.favorite) return false
    if (filters.tag && !contact.tags.includes(filters.tag)) return false
    return contactMatches(contact, filters.query)
  })

  return filtered.sort((a, b) => {
    if (filters.sort === 'name') {
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function collectTagCounts(contacts: Contact[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const contact of contacts) {
    for (const tag of contact.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'),
  )
}

export function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (/^[\u3400-\u9fff]/.test(trimmed)) return trimmed.slice(0, 1)
  const parts = trimmed.split(/\s+/)
  return parts.length > 1
    ? `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
    : trimmed.slice(0, 2).toUpperCase()
}

const AVATAR_PALETTES = [
  ['#e7b35d', '#b8642e'],
  ['#6fae9c', '#276252'],
  ['#e78c7a', '#a6453d'],
  ['#8d9ec8', '#485782'],
  ['#c39cc7', '#725077'],
  ['#95aa72', '#4d6337'],
  ['#dca78d', '#895c48'],
  ['#7db3c7', '#356b80'],
]

export function avatarPalette(name: string): { from: string; to: string } {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  const [from, to] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
  return { from, to }
}

export function formatShortDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatFullDate(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function relativeUpdated(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚更新'
  const diff = Date.now() - date.getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚更新'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return formatShortDate(value)
}

export function mergeImportedContacts(
  existing: Contact[],
  incoming: ContactDraft[],
  mode: 'merge' | 'append',
): { contacts: Contact[]; stats: { added: number; merged: number; total: number } } {
  if (mode === 'append') {
    const now = new Date().toISOString()
    const appended = incoming.map((draft) => ({
      ...draft,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    }))
    return {
      contacts: [...appended, ...existing],
      stats: { added: appended.length, merged: 0, total: existing.length + appended.length },
    }
  }

  const contacts = existing.map((contact) => ({
    ...contact,
    methods: [...contact.methods],
    tags: [...contact.tags],
  }))
  const indexByName = new Map<string, number>()
  contacts.forEach((contact, index) => {
    const key = normalizeName(contact.name)
    if (!indexByName.has(key)) indexByName.set(key, index)
  })

  let added = 0
  let merged = 0
  const now = new Date().toISOString()

  for (const draft of incoming) {
    const key = normalizeName(draft.name)
    const existingIndex = indexByName.get(key)

    if (existingIndex === undefined) {
      contacts.unshift({
        ...draft,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      })
      indexByName.set(key, 0)
      added += 1
      continue
    }

    const target = contacts[existingIndex]
    const methodKeys = new Set(
      target.methods.map((method) => `${method.kind}:${normalizeMethodValue(method.kind, method.value)}`),
    )
    for (const method of draft.methods) {
      const methodKey = `${method.kind}:${normalizeMethodValue(method.kind, method.value)}`
      if (!methodKeys.has(methodKey)) {
        target.methods.push({ ...method, id: uid('m') })
        methodKeys.add(methodKey)
      }
    }

    target.company ||= draft.company
    target.title ||= draft.title
    target.birthday ||= draft.birthday
    target.notes = target.notes || draft.notes
    target.favorite ||= draft.favorite
    target.tags = Array.from(new Set([...target.tags, ...draft.tags]))
    target.updatedAt = now
    merged += 1
  }

  return { contacts, stats: { added, merged, total: contacts.length } }
}
