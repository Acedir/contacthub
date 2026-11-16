import type { Contact, ContactMethod, MethodKind } from '../types'
import { METHOD_KINDS } from '../types'
import { seedContacts } from '../data/seed'

export const STORAGE_KEY = 'contacthub.contacts.v1'

function isMethodKind(value: unknown): value is MethodKind {
  return typeof value === 'string' && (METHOD_KINDS as readonly string[]).includes(value)
}

function normalizeMethod(value: unknown): ContactMethod | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ContactMethod>
  if (!isMethodKind(candidate.kind) || typeof candidate.value !== 'string') return null
  return {
    id: typeof candidate.id === 'string' ? candidate.id : `m_${Math.random().toString(36).slice(2)}`,
    kind: candidate.kind,
    label: typeof candidate.label === 'string' ? candidate.label : '',
    value: candidate.value,
  }
}

function normalizeContact(value: unknown): Contact | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<Contact>
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !candidate.name.trim()) {
    return null
  }

  const methods = Array.isArray(candidate.methods)
    ? candidate.methods.map(normalizeMethod).filter((method): method is ContactMethod => method !== null)
    : []
  const timestamp = new Date().toISOString()

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    company: typeof candidate.company === 'string' ? candidate.company : '',
    title: typeof candidate.title === 'string' ? candidate.title : '',
    birthday: typeof candidate.birthday === 'string' ? candidate.birthday : '',
    favorite: Boolean(candidate.favorite),
    methods,
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
      : [],
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : timestamp,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : timestamp,
  }
}

export function loadContacts(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): Contact[] {
  if (!storage) return seedContacts()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = seedContacts()
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedContacts()
    const contacts = parsed
      .map(normalizeContact)
      .filter((contact): contact is Contact => contact !== null)
    return contacts
  } catch {
    return seedContacts()
  }
}

export function saveContacts(
  contacts: Contact[],
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(contacts))
  } catch {
    // A full or disabled localStorage should never break the editing flow.
  }
}

export function resetContacts(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): Contact[] {
  const seeded = seedContacts()
  saveContacts(seeded, storage)
  return seeded
}
