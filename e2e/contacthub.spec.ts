import { mkdir } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { expect, test } from '@playwright/test'

const importedName = '导入测试联系人'

async function makeImportWorkbook(): Promise<string> {
  await mkdir('test-results', { recursive: true })
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('联系人')
  sheet.addRow(['姓名', '公司', '电话 1 标签', '电话 1', '电话 2 标签', '电话 2', '邮箱 1', '标签', '收藏', '备注'])
  sheet.addRow([
    importedName,
    '表格科技',
    '手机',
    '137 5555 8888',
    '工作',
    '021-5555 8888',
    'imported@example.com',
    '客户；测试',
    '是',
    '来自端到端测试表格',
  ])
  const path = 'test-results/import-sample.xlsx'
  await workbook.xlsx.writeFile(path)
  return path
}

test.describe('拾光通讯录', () => {
  test('homepage renders and bookmark filtering works', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.contact-card')).toHaveCount(9)
    await expect(page.getByRole('heading', { name: '全部联系人', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '收藏 周予安' }).click()
    await expect(page.locator('.side-link').filter({ hasText: '我的收藏' }).locator('b')).toHaveText('4')

    await page.locator('.side-link').filter({ hasText: '我的收藏' }).click()
    await expect(page.locator('.contact-card')).toHaveCount(4)
    await expect(page.getByRole('heading', { name: '我的收藏', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '取消收藏 周予安' }).click()
    await expect(page.locator('.contact-card')).toHaveCount(3)
  })

  test('creates a contact with multiple phones and emails, then opens details', async ({ page }) => {
    await page.goto('/')
    await page.locator('.add-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByTestId('contact-name').fill('测试联系人')
    await page.getByLabel('公司').fill('测试工作室')
    await page.getByLabel('职位').fill('质量工程师')
    await page.getByLabel('生日').fill('1997-08-12')
    await page.getByLabel('电话内容').first().fill('138 1111 2222')

    const phoneGroup = page.locator('.method-editor-group').nth(0)
    await phoneGroup.getByRole('button', { name: '添加', exact: true }).click()
    await page.getByLabel('电话内容').nth(1).fill('021-6666 3333')

    await page.getByRole('button', { name: '添加一个邮箱' }).click()
    await page.getByLabel('邮箱内容').first().fill('first@example.com')
    const emailGroup = page.locator('.method-editor-group').nth(1)
    await emailGroup.getByRole('button', { name: '添加', exact: true }).click()
    await page.getByLabel('邮箱内容').nth(1).fill('second@example.com')

    await page.getByRole('textbox', { name: '标签', exact: true }).fill('测试，朋友')
    await page.getByLabel('备注').fill('通过端到端测试创建，包含多条电话和邮箱。')
    await page.getByRole('button', { name: /收藏这位联系人/ }).click()
    await page.getByRole('button', { name: '添加联系人', exact: true }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('已添加「测试联系人」到通讯录')).toBeVisible()

    await page.getByLabel('搜索联系人').fill('测试联系人')
    await expect(page.locator('.contact-card')).toHaveCount(1)
    await page.locator('.contact-card').click()

    const drawer = page.getByRole('dialog', { name: '测试联系人 的联系人详情' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('138 1111 2222')).toBeVisible()
    await expect(drawer.getByText('021-6666 3333')).toBeVisible()
    await expect(drawer.getByText('first@example.com')).toBeVisible()
    await expect(drawer.getByText('second@example.com')).toBeVisible()
    await expect(drawer.getByText('通过端到端测试创建')).toBeVisible()
  })

  test('exports a valid Excel workbook with one row per contact', async ({ page }) => {
    await page.goto('/')
    const downloadPromise = page.waitForEvent('download')
    await page.locator('.topbar-quick').getByRole('button', { name: '导出 Excel' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^拾光通讯录_\d{4}-\d{2}-\d{2}\.xlsx$/)

    const path = 'test-results/exported.xlsx'
    await download.saveAs(path)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path)
    const sheet = workbook.getWorksheet('联系人')
    expect(sheet).toBeTruthy()
    expect(sheet!.rowCount).toBe(10)
    expect(sheet!.getCell(1, 2).value).toBe('姓名')
    expect(sheet!.getCell(2, 2).value).toBeTruthy()
    expect(workbook.getWorksheet('导入说明')).toBeTruthy()
  })

  test('imports an Excel file after previewing it', async ({ page }) => {
    const file = await makeImportWorkbook()
    await page.goto('/')
    await page.locator('.topbar-quick').getByRole('button', { name: '导入 Excel' }).click()
    await page.getByTestId('import-file-input').setInputFiles(file)

    await expect(page.getByRole('heading', { name: '确认导入内容' })).toBeVisible()
    await expect(page.getByText(importedName)).toBeVisible()
    await expect(page.getByText('可导入联系人')).toBeVisible()
    await page.getByTestId('import-confirm').click()

    await expect(page.getByText(/导入完成：新增 1 位/)).toBeVisible()
    await page.getByLabel('搜索联系人').fill(importedName)
    await expect(page.locator('.contact-card')).toHaveCount(1)
    await expect(page.locator('.contact-card')).toContainText(importedName)
    await expect(page.locator('.contact-card')).toContainText('137 5555 8888')
  })

  test('deletes a contact after confirmation', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('搜索联系人').fill('顾言')
    await expect(page.locator('.contact-card')).toHaveCount(1)
    await page.locator('.contact-card').click()
    await page.getByRole('dialog', { name: '顾言 的联系人详情' }).getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('heading', { name: '删除这位联系人？' })).toBeVisible()
    await page.getByRole('button', { name: '确认删除' }).click()
    await expect(page.getByText('已删除「顾言」')).toBeVisible()
    await expect(page.locator('.contact-card')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '没有找到匹配的联系人' })).toBeVisible()
  })

  test('mobile layout has no horizontal overflow and shows bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('.mobile-nav')).toBeVisible()
    await expect(page.locator('.sidebar')).toBeHidden()
    await expect(page.locator('.contact-card')).toHaveCount(9)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'docs/screenshots/mobile-home.png', fullPage: true })
  })
})
