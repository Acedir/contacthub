import { mkdir } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { chromium } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173'
await mkdir('docs/screenshots', { recursive: true })
await mkdir('docs/demo', { recursive: true })

const importWorkbook = new ExcelJS.Workbook()
const sheet = importWorkbook.addWorksheet('联系人')
sheet.addRow(['姓名', '公司', '电话 1 标签', '电话 1', '电话 2 标签', '电话 2', '邮箱 1', '标签', '收藏', '备注'])
sheet.addRow([
  '导入示例 · 宋遥',
  '青禾咨询',
  '手机',
  '137 5555 8899',
  '工作',
  '021-5555 8899',
  'song.yao@example.com',
  '客户；咨询',
  '是',
  '从 Excel 导入，自动识别多条联系方式。',
])
sheet.addRow([
  '导入示例 · 陆青',
  '自由职业',
  '手机',
  '136 4444 7788',
  '个人',
  'lu.qing@example.com',
  '',
  '朋友',
  '否',
  '',
])
await importWorkbook.xlsx.writeFile('docs/demo/import-sample.xlsx')

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.goto(baseURL, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true, animations: 'disabled' })
await page.screenshot({ path: 'docs/screenshots/home-viewport.png', animations: 'disabled' })

await page.locator('.contact-card').first().click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/screenshots/contact-detail.png', animations: 'disabled' })

await page.getByRole('button', { name: '编辑资料' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/screenshots/contact-form.png', animations: 'disabled' })
await page.locator('.modal-body').evaluate((element) => {
  element.scrollTop = 520
})
await page.waitForTimeout(250)
await page.screenshot({ path: 'docs/screenshots/contact-form-methods.png', animations: 'disabled' })
await page.getByRole('button', { name: '关闭弹窗' }).click()
await page.waitForTimeout(200)

await page.locator('.side-link').filter({ hasText: '我的收藏' }).click()
await page.waitForTimeout(250)
await page.screenshot({ path: 'docs/screenshots/favorites.png', animations: 'disabled' })
await page.locator('.side-link').filter({ hasText: '全部联系人' }).click()

await page.getByRole('button', { name: '使用说明与快捷键' }).click()
await page.waitForTimeout(250)
await page.screenshot({ path: 'docs/screenshots/guide.png', animations: 'disabled' })
await page.getByRole('button', { name: '关闭弹窗' }).click()

await page.getByRole('button', { name: '从 Excel 导入' }).click()
await page.getByTestId('import-file-input').setInputFiles('docs/demo/import-sample.xlsx')
await page.getByRole('heading', { name: '确认导入内容' }).waitFor()
await page.waitForTimeout(350)
await page.screenshot({ path: 'docs/screenshots/import-preview.png', animations: 'disabled' })
await page.getByRole('button', { name: '关闭弹窗' }).click()

const mobile = await context.newPage()
await mobile.setViewportSize({ width: 390, height: 844 })
await mobile.goto(baseURL, { waitUntil: 'networkidle' })
await mobile.waitForTimeout(250)
await mobile.screenshot({ path: 'docs/screenshots/mobile-home.png', fullPage: true, animations: 'disabled' })
await mobile.locator('.contact-card').first().click()
await mobile.waitForTimeout(250)
await mobile.screenshot({ path: 'docs/screenshots/mobile-detail.png', animations: 'disabled' })

await context.close()
await browser.close()
console.log('Screenshots written to docs/screenshots')
