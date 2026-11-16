import { describe, expect, it } from 'vitest'
import type { Contact, ContactDraft } from '../types'
import {
  filterContacts,
  mergeImportedContacts,
  normalizeMethodValue,
  parseTags,
  sanitizeMethods,
} from './contacts'
import { createContactsWorkbook, parseContactsWorkbook } from './excel'

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    name: '林知夏',
    company: '木棉设计',
    title: '产品设计师',
    birthday: '1995-04-18',
    favorite: true,
    methods: [
      { id: 'm1', kind: 'phone', label: '手机', value: '138 0000 1024' },
      { id: 'm2', kind: 'email', label: '工作', value: 'zhixia@example.com' },
    ],
    tags: ['朋友', '设计'],
    notes: '喜欢手冲咖啡',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
    ...overrides,
  }
}

function makeDraft(overrides: Partial<ContactDraft> = {}): ContactDraft {
  return {
    name: '林知夏',
    company: '',
    title: '',
    birthday: '',
    favorite: false,
    methods: [{ id: 'new-m', kind: 'email', label: '个人', value: 'lin@example.com' }],
    tags: ['新标签'],
    notes: '',
    ...overrides,
  }
}

describe('contact helpers', () => {
  it('searches across nested contact methods and sorts by name', () => {
    const contacts = [
      makeContact(),
      makeContact({ id: 'c2', name: '陈屿', favorite: false, methods: [], tags: ['技术'], updatedAt: '2026-11-16T00:00:00.000Z' }),
    ]

    expect(filterContacts(contacts, { query: '1380000', favoriteOnly: false, tag: null, sort: 'name' })).toHaveLength(1)
    expect(filterContacts(contacts, { query: '技术', favoriteOnly: false, tag: null, sort: 'updated' })[0].name).toBe('陈屿')
    expect(filterContacts(contacts, { query: '', favoriteOnly: true, tag: null, sort: 'name' })[0].name).toBe('林知夏')
    expect(filterContacts(contacts, { query: '', favoriteOnly: false, tag: '技术', sort: 'name' })[0].name).toBe('陈屿')
  })

  it('deduplicates methods and normalizes phone numbers', () => {
    const methods = sanitizeMethods([
      { id: 'a', kind: 'phone', label: ' 手机 ', value: '138-0000-1024' },
      { id: 'b', kind: 'phone', label: '工作', value: '138 0000 1024' },
      { id: 'c', kind: 'email', label: '', value: ' HELLO@EXAMPLE.COM ' },
      { id: 'd', kind: 'email', label: '', value: 'hello@example.com' },
      { id: 'e', kind: 'address', label: '', value: '   ' },
    ])
    expect(methods).toHaveLength(2)
    expect(normalizeMethodValue('phone', '138-0000-1024')).toBe('13800001024')
    expect(methods.map((method) => method.kind)).toEqual(['phone', 'email'])
  })

  it('parses Chinese and western tag separators', () => {
    expect(parseTags('朋友，设计; 工作、客户\n朋友')).toEqual(['朋友', '设计', '工作', '客户'])
  })

  it('appends all imported contacts without changing existing records', () => {
    const existing = [makeContact()]
    const result = mergeImportedContacts(existing, [makeDraft(), makeDraft({ name: '新朋友' })], 'append')
    expect(result.stats.added).toBe(2)
    expect(result.stats.merged).toBe(0)
    expect(result.contacts).toHaveLength(3)
    expect(result.contacts.some((contact) => contact.name === '新朋友')).toBe(true)
  })

  it('merges by name, preserving methods while adding new ones', () => {
    const existing = [makeContact()]
    const result = mergeImportedContacts(
      existing,
      [
        makeDraft({
          methods: [
            { id: 'n1', kind: 'phone', label: '手机', value: '13800001024' },
            { id: 'n2', kind: 'email', label: '个人', value: 'lin@example.com' },
            { id: 'n3', kind: 'social', label: '微信', value: 'lin_wechat' },
          ],
          tags: ['设计', '重要'],
          notes: '新备注',
        }),
      ],
      'merge',
    )

    expect(result.stats.merged).toBe(1)
    expect(result.contacts).toHaveLength(1)
    const merged = result.contacts[0]
    expect(merged.methods).toHaveLength(4)
    expect(merged.methods.map((method) => method.kind)).toEqual(['phone', 'email', 'email', 'social'])
    expect(merged.tags).toEqual(['朋友', '设计', '重要'])
    expect(merged.notes).toBe('喜欢手冲咖啡')
  })
})

describe('Excel export and import', () => {
  it('writes one contact per row and one column per method type', async () => {
    const contacts = [
      makeContact({
        methods: [
          { id: 'p1', kind: 'phone', label: '手机', value: '138 0000 1024' },
          { id: 'p2', kind: 'phone', label: '工作', value: '021-6888 1024' },
          { id: 'e1', kind: 'email', label: '工作', value: 'zhixia@example.com' },
        ],
      }),
      makeContact({
        id: 'c2',
        name: '陈屿',
        favorite: false,
        methods: [{ id: 'p3', kind: 'phone', label: '手机', value: '139 0000 2048' }],
        tags: ['技术'],
      }),
    ]

    const workbook = await createContactsWorkbook(contacts)
    const sheet = workbook.getWorksheet('联系人')
    expect(sheet).toBeDefined()
    expect(sheet!.rowCount).toBe(3)
    expect(sheet!.getCell(1, 2).value).toBe('姓名')
    expect(sheet!.getCell(1, 9).value).toBe('手机 1 标签')
    expect(sheet!.getCell(1, 10).value).toBe('手机 1')
    expect(sheet!.getCell(1, 12).value).toBe('手机 2')
    expect(sheet!.getCell(2, 2).value).toBe('林知夏')
    expect(sheet!.getCell(3, 2).value).toBe('陈屿')
    expect(sheet!.getCell(2, 6).value).toBe('是')
    expect(sheet!.getCell(3, 6).value).toBe('否')
    expect(workbook.getWorksheet('导入说明')).toBeDefined()
  })

  it('round-trips exported data through the importer', async () => {
    const original = [
      makeContact({
        methods: [
          { id: 'p1', kind: 'phone', label: '手机', value: '138 0000 1024' },
          { id: 'p2', kind: 'phone', label: '工作', value: '021-6888 1024' },
          { id: 'e1', kind: 'email', label: '工作', value: 'zhixia@example.com' },
          { id: 'a1', kind: 'address', label: '工作室', value: '上海市静安区愚园路 1088 号' },
          { id: 's1', kind: 'social', label: '微信', value: 'linzhixia_design' },
        ],
      }),
      makeContact({
        id: 'c2',
        name: '陈屿',
        favorite: false,
        methods: [{ id: 'p3', kind: 'phone', label: '手机', value: '13900002048' }],
        tags: ['技术'],
        notes: '',
      }),
    ]

    const workbook = await createContactsWorkbook(original)
    const buffer = await workbook.xlsx.writeBuffer()
    const preview = await parseContactsWorkbook(buffer as unknown as ArrayBuffer, 'roundtrip.xlsx')

    expect(preview.contacts).toHaveLength(2)
    expect(preview.skippedRows).toBe(0)
    const first = preview.contacts.find((contact) => contact.name === '林知夏')!
    expect(first.favorite).toBe(true)
    expect(first.methods.filter((method) => method.kind === 'phone')).toHaveLength(2)
    expect(first.methods.filter((method) => method.kind === 'email')).toHaveLength(1)
    expect(first.tags).toEqual(['朋友', '设计'])
    expect(first.notes).toBe('喜欢手冲咖啡')
    expect(first.birthday).toBe('1995-04-18')
  })

  it('accepts a simple workbook with generic contact columns', async () => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('通讯录')
    sheet.addRow(['姓名', '电话', '邮箱', '地址', '收藏', '标签'])
    sheet.addRow(['周予安', '021-6600 8899; 13800001234', 'yuan@example.com', '上海市浦东新区', '是', '工作；投资'])
    sheet.addRow(['缺少联系方式', '', '', '', '否', ''])

    const buffer = await workbook.xlsx.writeBuffer()
    const preview = await parseContactsWorkbook(buffer as unknown as ArrayBuffer, 'simple.xlsx')

    expect(preview.contacts).toHaveLength(2)
    expect(preview.contacts[0].name).toBe('周予安')
    expect(preview.contacts[0].methods.filter((method) => method.kind === 'phone')).toHaveLength(2)
    expect(preview.contacts[0].favorite).toBe(true)
    expect(preview.contacts[0].tags).toEqual(['工作', '投资'])
  })

  it('reports a helpful error when the name column is missing', async () => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Sheet1')
    sheet.addRow(['电话', '邮箱'])
    sheet.addRow(['13800000000', 'test@example.com'])
    const buffer = await workbook.xlsx.writeBuffer()

    await expect(parseContactsWorkbook(buffer as unknown as ArrayBuffer)).rejects.toThrow(/姓名/)
  })
})
