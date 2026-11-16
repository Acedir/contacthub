import type { CellValue, Workbook, Worksheet } from 'exceljs'
import type { Contact, ContactDraft, ContactMethod, ImportPreview, MethodKind } from '../types'
import { METHOD_DEFAULT_LABEL, METHOD_KINDS } from '../types'
import { createMethod, parseTags, sanitizeMethods, uid } from './contacts'

const METHOD_HEADER_NAMES: Record<MethodKind, string> = {
  phone: '手机',
  email: '邮箱',
  address: '地址',
  social: '社交',
}

const BASE_HEADERS = ['序号', '姓名', '公司', '职位', '生日', '收藏', '标签', '备注'] as const

const BASE_ALIASES: Record<string, string[]> = {
  name: ['姓名', '名字', '联系人', '联系人姓名', 'name', 'fullname', 'contactname'],
  company: ['公司', '单位', '公司名称', 'company', 'organization', 'organisation'],
  title: ['职位', '职务', 'title', 'jobtitle', 'position'],
  birthday: ['生日', '出生日期', 'birthday', 'birthdate', 'dateofbirth'],
  favorite: ['收藏', '书签', '是否收藏', 'bookmark', 'favorite', 'favourite', 'starred'],
  tags: ['标签', '分组', 'tags', 'tag', 'group'],
  notes: ['备注', '说明', 'notes', 'note', 'memo', 'remark'],
}

const METHOD_ALIASES: Record<MethodKind, string[]> = {
  phone: ['手机号', '手机', '电话', '电话号码', '联系方式', 'phone', 'mobile', 'tel', 'telephone'],
  email: ['电子邮箱', '邮箱', 'email', 'mail'],
  address: ['地址', '住址', 'address', 'location'],
  social: ['社交媒体', '社交账号', '社交', '微信', 'wechat', 'socialmedia', 'social', 'weibo', 'linkedin'],
}

const KIND_BY_ALIAS = new Map<string, MethodKind>()
for (const kind of METHOD_KINDS) {
  for (const alias of METHOD_ALIASES[kind]) {
    KIND_BY_ALIAS.set(normalizeHeader(alias), kind)
  }
}

const BASE_BY_ALIAS = new Map<string, keyof typeof BASE_ALIASES>()
for (const [field, aliases] of Object.entries(BASE_ALIASES)) {
  for (const alias of aliases) {
    BASE_BY_ALIAS.set(normalizeHeader(alias), field as keyof typeof BASE_ALIASES)
  }
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/[*＊]/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[\s_\-/\\.]/g, '')
    .toLocaleLowerCase()
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function cellToString(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (value instanceof Date) return formatIsoDate(value)
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('hyperlink' in value && typeof value.hyperlink === 'string') {
      return ('text' in value && typeof value.text === 'string' ? value.text : value.hyperlink).trim()
    }
    if ('result' in value) return cellToString(value.result as CellValue)
    if ('error' in value) return ''
  }
  return String(value).trim()
}

function readRowValue(sheet: Worksheet, rowNumber: number, columnNumber: number | undefined): string {
  if (!columnNumber) return ''
  return cellToString(sheet.getRow(rowNumber).getCell(columnNumber).value)
}

function splitValues(kind: MethodKind, raw: string): string[] {
  const separator = kind === 'address' ? /\r?\n|[;；|]/ : /\r?\n|[,，;；|]/
  return raw
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)
}

function withLabel(kind: MethodKind, raw: string): Array<{ label: string; value: string }> {
  return splitValues(kind, raw).map((line) => {
    const match = line.match(/^([^:：]{1,12})[:：]\s*(.+)$/)
    if (match && !/^https?$/i.test(match[1])) {
      return { label: match[1].trim(), value: match[2].trim() }
    }
    return { label: METHOD_DEFAULT_LABEL[kind], value: line }
  })
}

function parseFavorite(raw: string): boolean {
  return /^(是|已收藏|true|yes|y|1|★|⭐)$/i.test(raw.trim())
}

function findHeaderRow(sheet: Worksheet): number {
  const max = Math.min(sheet.rowCount, 12)
  for (let rowNumber = 1; rowNumber <= max; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    let hasName = false
    row.eachCell((cell) => {
      const field = BASE_BY_ALIAS.get(normalizeHeader(cellToString(cell.value)))
      if (field === 'name') hasName = true
    })
    if (hasName) return rowNumber
  }
  return 1
}

interface MethodColumn {
  kind: MethodKind
  index: number
  labelColumn?: number
  valueColumn?: number
}

interface ParsedHeader {
  base: Partial<Record<keyof typeof BASE_ALIASES, number>>
  methods: MethodColumn[]
  generic: Partial<Record<MethodKind, number>>
}

function parseHeader(sheet: Worksheet, headerRow: number): ParsedHeader {
  const result: ParsedHeader = { base: {}, methods: [], generic: {} }
  const pairColumns = new Map<string, MethodColumn>()

  sheet.getRow(headerRow).eachCell((cell, columnNumber) => {
    const normalized = normalizeHeader(cellToString(cell.value))
    if (!normalized) return

    const baseField = BASE_BY_ALIAS.get(normalized)
    if (baseField && result.base[baseField] === undefined) {
      result.base[baseField] = columnNumber
      return
    }

    const directKind = KIND_BY_ALIAS.get(normalized)
    if (directKind && result.generic[directKind] === undefined) {
      result.generic[directKind] = columnNumber
      return
    }

    const pairMatch = normalized.match(
      /^(手机号|手机|电话|电话号码|联系方式|phone|mobile|tel|telephone|电子邮箱|邮箱|email|mail|地址|住址|address|location|社交媒体|社交账号|社交|微信|wechat|socialmedia|social|weibo|linkedin)(\d+)(标签|label)?$/,
    )
    if (!pairMatch) return

    const kind = KIND_BY_ALIAS.get(pairMatch[1])
    if (!kind) return
    const key = `${kind}-${pairMatch[2]}`
    const pair = pairColumns.get(key) ?? { kind, index: Number(pairMatch[2]) }
    if (pairMatch[3]) pair.labelColumn = columnNumber
    else pair.valueColumn = columnNumber
    pairColumns.set(key, pair)
  })

  result.methods = Array.from(pairColumns.values())
    .filter((pair) => pair.valueColumn !== undefined)
    .sort((a, b) => METHOD_KINDS.indexOf(a.kind) - METHOD_KINDS.indexOf(b.kind) || a.index - b.index)
  return result
}

function draftFromRow(sheet: Worksheet, rowNumber: number, header: ParsedHeader): ContactDraft | null {
  const name = readRowValue(sheet, rowNumber, header.base.name)
  const methods: ContactMethod[] = []

  for (const pair of header.methods) {
    const rawValue = readRowValue(sheet, rowNumber, pair.valueColumn)
    if (!rawValue) continue
    const label = readRowValue(sheet, rowNumber, pair.labelColumn) || METHOD_DEFAULT_LABEL[pair.kind]
    const values = splitValues(pair.kind, rawValue)
    for (const value of values) {
      methods.push(createMethod(pair.kind, splitValues(pair.kind, label)[0] || METHOD_DEFAULT_LABEL[pair.kind], value))
    }
  }

  for (const kind of METHOD_KINDS) {
    const raw = readRowValue(sheet, rowNumber, header.generic[kind])
    if (!raw) continue
    for (const parsed of withLabel(kind, raw)) {
      methods.push(createMethod(kind, parsed.label, parsed.value))
    }
  }

  if (!name) return null

  const birthdayRaw = header.base.birthday
    ? sheet.getRow(rowNumber).getCell(header.base.birthday).value
    : ''
  const birthday =
    birthdayRaw instanceof Date
      ? formatIsoDate(birthdayRaw)
      : readRowValue(sheet, rowNumber, header.base.birthday)

  return {
    name,
    company: readRowValue(sheet, rowNumber, header.base.company),
    title: readRowValue(sheet, rowNumber, header.base.title),
    birthday,
    favorite: parseFavorite(readRowValue(sheet, rowNumber, header.base.favorite)),
    methods: sanitizeMethods(methods),
    tags: parseTags(readRowValue(sheet, rowNumber, header.base.tags)),
    notes: readRowValue(sheet, rowNumber, header.base.notes),
  }
}

export async function parseContactsWorkbook(
  data: ArrayBuffer,
  fileName = '通讯录.xlsx',
): Promise<ImportPreview> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(data as unknown as ArrayBuffer)

  const sheet =
    workbook.worksheets.find((candidate) => candidate.name === '联系人') ?? workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Excel 文件中没有可读取的工作表。')
  }

  const headerRow = findHeaderRow(sheet)
  const header = parseHeader(sheet, headerRow)
  if (!header.base.name) {
    throw new Error('未找到“姓名”列，请使用系统导出的模板或包含姓名列的表格。')
  }
  if (!header.methods.length && !Object.keys(header.generic).length) {
    throw new Error('未找到电话、邮箱、地址或社交账号列，请检查表头是否与模板一致。')
  }

  const drafts: ContactDraft[] = []
  const warnings: string[] = []
  let totalRows = 0
  let skippedRows = 0
  const lastRow = Math.min(sheet.rowCount, headerRow + 5000)

  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const hasAnyValue = row.values instanceof Array
      ? row.values.slice(1).some((value) => cellToString(value as CellValue) !== '')
      : true
    if (!hasAnyValue) continue

    totalRows += 1
    const draft = draftFromRow(sheet, rowNumber, header)
    if (!draft) {
      skippedRows += 1
      if (warnings.length < 8) warnings.push(`第 ${rowNumber} 行缺少姓名，已跳过。`)
      continue
    }
    if (!draft.methods.length && warnings.length < 8) {
      warnings.push(`第 ${rowNumber} 行“${draft.name}”没有联系方式，仍会导入。`)
    }
    drafts.push(draft)
  }

  if (!drafts.length) {
    throw new Error(
      skippedRows > 0
        ? `没有可导入的联系人：${skippedRows} 行缺少姓名或内容为空。`
        : '表格中没有可导入的联系人数据。',
    )
  }
  if (sheet.rowCount > lastRow) {
    warnings.push(`表格超过 5000 行，仅读取前 5000 行。`)
  }

  return { contacts: drafts, totalRows, skippedRows, warnings, fileName }
}

function maxMethodCount(contacts: Contact[], kind: MethodKind): number {
  const maximum = contacts.reduce(
    (count, contact) => Math.max(count, contact.methods.filter((method) => method.kind === kind).length),
    0,
  )
  return Math.max(1, Math.min(maximum, 50))
}

function methodAt(contact: Contact, kind: MethodKind, index: number): ContactMethod | undefined {
  return contact.methods.filter((method) => method.kind === kind)[index - 1]
}

export async function createContactsWorkbook(contacts: Contact[]): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '拾光通讯录 Luma Contacts'
  workbook.lastModifiedBy = '拾光通讯录 Luma Contacts'
  workbook.created = new Date()
  workbook.modified = new Date()

  const counts = Object.fromEntries(
    METHOD_KINDS.map((kind) => [kind, maxMethodCount(contacts, kind)]),
  ) as Record<MethodKind, number>

  const methodHeaders = METHOD_KINDS.flatMap((kind) =>
    Array.from({ length: counts[kind] }, (_, index) => [
      `${METHOD_HEADER_NAMES[kind]} ${index + 1} 标签`,
      `${METHOD_HEADER_NAMES[kind]} ${index + 1}`,
    ]).flat(),
  )
  const headers = [...BASE_HEADERS, ...methodHeaders]

  const sheet = workbook.addWorksheet('联系人', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }],
    properties: { defaultRowHeight: 24 },
  })
  sheet.addRow(headers)
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  contacts.forEach((contact, contactIndex) => {
    const row: Array<string | number> = [
      contactIndex + 1,
      contact.name,
      contact.company,
      contact.title,
      contact.birthday,
      contact.favorite ? '是' : '否',
      contact.tags.join('；'),
      contact.notes,
    ]

    for (const kind of METHOD_KINDS) {
      for (let index = 1; index <= counts[kind]; index += 1) {
        const method = methodAt(contact, kind, index)
        row.push(method?.label ?? '', method?.value ?? '')
      }
    }
    sheet.addRow(row)
  })

  const lastRow = Math.max(sheet.rowCount, 2)
  const headerRow = sheet.getRow(1)
  headerRow.height = 32
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B3E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF164B3E' } },
      left: { style: 'thin', color: { argb: 'FF2D6255' } },
      bottom: { style: 'thin', color: { argb: 'FF164B3E' } },
      right: { style: 'thin', color: { argb: 'FF2D6255' } },
    }
  })

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    row.height = 28
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF25352E' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFD8D2C3' } },
        left: { style: 'hair', color: { argb: 'FFD8D2C3' } },
        bottom: { style: 'hair', color: { argb: 'FFD8D2C3' } },
        right: { style: 'hair', color: { argb: 'FFD8D2C3' } },
      }
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7EE' } }
      }
    })
    const nameCell = sheet.getCell(rowNumber, 2)
    nameCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF1A3028' } }
    const favoriteCell = sheet.getCell(rowNumber, 6)
    favoriteCell.alignment = { horizontal: 'center', vertical: 'middle' }
    if (favoriteCell.value === '是') {
      favoriteCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFB06A22' } }
      favoriteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1D8' } }
    }
  }

  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 16
  sheet.getColumn(3).width = 22
  sheet.getColumn(4).width = 18
  sheet.getColumn(5).width = 14
  sheet.getColumn(6).width = 9
  sheet.getColumn(7).width = 24
  sheet.getColumn(8).width = 36
  for (let column = 9; column <= headers.length; column += 1) {
    sheet.getColumn(column).width = column % 2 === 1 ? 13 : 24
  }
  const validationSheet = sheet as Worksheet & {
    dataValidations: {
      add: (
        range: string,
        validation: { type: 'list'; allowBlank: boolean; formulae: string[] },
      ) => void
    }
  }
  validationSheet.dataValidations.add(`F2:F${Math.max(5000, lastRow)}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"是,否"'],
  })

  const guide = workbook.addWorksheet('导入说明')
  guide.columns = [{ width: 24 }, { width: 96 }]
  guide.mergeCells('A1:B1')
  const titleCell = guide.getCell('A1')
  titleCell.value = '拾光通讯录 · Excel 导入说明'
  titleCell.font = { name: 'Microsoft YaHei', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B3E' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  guide.getRow(1).height = 38

  const guideRows: Array<[string, string]> = [
    ['文件格式', '仅支持 .xlsx / .xlsm。每个联系人占一行，每一种联系方式占独立列。'],
    ['必填字段', '“姓名”必填；“公司、职位、生日、标签、备注”均可留空。'],
    ['联系方式', '“手机 1 标签”和“手机 1”成对使用；邮箱、地址、社交账号同理。'],
    ['多个号码', '同一个联系人有多条电话/邮箱时，依次填写在 手机 1、手机 2……列中。'],
    ['收藏', '填“是”或“否”。导入后仍可在页面中随时点亮星标。'],
    ['标签', '多个标签用中文分号“；”分隔，例如：朋友；设计。'],
    ['生日', '推荐使用 YYYY-MM-DD 格式，例如：1995-04-18。'],
    ['导入规则', '“合并”按姓名匹配并补充联系方式；“追加”会保留所有现有联系人。'],
    ['数据安全', '数据只保存在当前浏览器的 localStorage，不会上传到服务器。'],
  ]
  guideRows.forEach(([label, description], index) => {
    const row = guide.addRow([label, description])
    row.height = 34
    row.eachCell((cell, column) => {
      cell.font = {
        name: 'Microsoft YaHei',
        size: 10,
        bold: column === 1,
        color: { argb: column === 1 ? 'FF164B3E' : 'FF3F4B44' },
      }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFF7F3E8' : 'FFFFFFFF' },
      }
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFD8D2C3' } },
      }
    })
  })

  const note = guide.addRow(['提示', '删除示例行后再导入自己的数据；系统会自动忽略“序号”列和“导入说明”工作表。'])
  note.height = 34
  note.eachCell((cell) => {
    cell.font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF7A5A2E' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1D8' } }
  })

  return workbook
}

export async function exportContactsBlob(contacts: Contact[]): Promise<Blob> {
  const workbook = await createContactsWorkbook(contacts)
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function downloadContactsExcel(contacts: Contact[]): Promise<void> {
  const blob = await exportContactsBlob(contacts)
  const date = formatIsoDate(new Date())
  downloadBlob(blob, `拾光通讯录_${date}.xlsx`)
}

export async function downloadContactTemplate(): Promise<void> {
  const now = new Date().toISOString()
  const template: Contact[] = [
    {
      id: uid('template'),
      name: '示例联系人（导入前请删除）',
      company: '示例公司',
      title: '产品经理',
      birthday: '1995-04-18',
      favorite: true,
      methods: [
        createMethod('phone', '手机', '138 0000 0000'),
        createMethod('phone', '工作', '021-6000 0000'),
        createMethod('email', '工作', 'hello@example.com'),
        createMethod('address', '公司', '上海市静安区示例路 1 号'),
        createMethod('social', '微信', 'wechat_example'),
      ],
      tags: ['朋友', '工作'],
      notes: '这是一行示例数据，可直接删除。',
      createdAt: now,
      updatedAt: now,
    },
  ]
  const workbook = await createContactsWorkbook(template)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    '拾光通讯录_导入模板.xlsx',
  )
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
