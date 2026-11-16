import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173'
await mkdir('docs/demo', { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: 'docs/demo', size: { width: 1280, height: 800 } },
})
const page = await context.newPage()

const wait = (ms) => page.waitForTimeout(ms)
const scrollTop = async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await wait(650)
}

await page.goto(baseURL, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  const cover = document.createElement('div')
  cover.id = 'demo-title'
  cover.innerHTML = `
    <div style="font-size:11px;letter-spacing:.28em;color:#dce8ad;font-weight:700;margin-bottom:14px;">FZU–MU · SOFTWARE ENGINEERING</div>
    <div style="font-size:52px;line-height:1.2;font-family:Georgia,'Songti SC',serif;font-weight:700;">拾光通讯录</div>
    <div style="font-size:15px;color:rgba(251,248,237,.66);margin-top:12px;letter-spacing:.08em;">收藏 · 多种联系方式 · Excel 导入导出</div>
    <div style="margin-top:26px;height:2px;width:56px;background:#dce8ad;"></div>
    <div style="font-size:10px;color:rgba(251,248,237,.38);margin-top:18px;">功能演示 · 演示数据均为虚构</div>
  `
  cover.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9999',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'background:radial-gradient(circle at 50% 20%,#1c4a3d,#0d2a22 70%)',
    'color:#fbf8ed',
    'transition:opacity .5s ease',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(cover)
})
await wait(2600)
await page.evaluate(() => {
  const cover = document.getElementById('demo-title')
  if (cover) {
    cover.style.opacity = '0'
    window.setTimeout(() => cover.remove(), 550)
  }
})
await wait(900)

// 01 — Bookmark and filter
await page.getByRole('button', { name: '收藏 周予安' }).click()
await wait(1300)
await page.locator('.side-link').filter({ hasText: '我的收藏' }).click()
await scrollTop()
await wait(2400)
await page.locator('.side-link').filter({ hasText: '全部联系人' }).click()
await scrollTop()
await wait(700)

// 02 — Create a contact with multiple phones and emails
await page.locator('.add-btn').click()
await page.getByTestId('contact-name').fill('演示联系人 · 江岚')
await page.getByLabel('公司').fill('远山产品实验室')
await page.getByLabel('职位').fill('用户研究员')
await wait(700)
await page.getByLabel('电话内容').first().fill('138 2468 1357')
await page.locator('.method-editor-group').nth(0).getByRole('button', { name: '添加', exact: true }).click()
await page.getByLabel('电话内容').nth(1).fill('021-6688 2046')
await wait(900)
await page.getByRole('button', { name: '添加一个邮箱' }).click()
await page.getByLabel('邮箱内容').first().fill('jiang.lan@example.com')
await page.locator('.method-editor-group').nth(1).getByRole('button', { name: '添加', exact: true }).click()
await page.getByLabel('邮箱内容').nth(1).fill('lan@studio.example.com')
await page.getByRole('textbox', { name: '标签', exact: true }).fill('朋友，研究')
await page.getByRole('button', { name: /收藏这位联系人/ }).click()
await wait(1800)
await page.getByRole('button', { name: '添加联系人', exact: true }).click()
await wait(1200)
await scrollTop()
await wait(900)

// 03 — Search and inspect the complete profile
await page.getByLabel('搜索联系人').fill('江岚')
await wait(1300)
await page.locator('.contact-card').click()
await wait(3600)
await page.getByRole('button', { name: '关闭详情' }).click()
await wait(700)
await page.getByLabel('搜索联系人').fill('')
await scrollTop()
await wait(900)

// 04 — Export as Excel
const downloadPromise = page.waitForEvent('download')
await page.locator('.topbar-quick').getByRole('button', { name: '导出 Excel' }).click()
const download = await downloadPromise
await download.saveAs('docs/demo/exported-demo.xlsx')
await wait(2600)

// 05 — Import preview and merge
await page.locator('.topbar-quick').getByRole('button', { name: '导入 Excel' }).click()
await page.getByTestId('import-file-input').setInputFiles('docs/demo/import-sample.xlsx')
await page.getByRole('heading', { name: '确认导入内容' }).waitFor()
await wait(3800)
await page.getByTestId('import-confirm').click()
await wait(2200)
await page.getByLabel('搜索联系人').fill('宋遥')
await wait(1200)
await page.locator('.contact-card').click()
await wait(2800)
await page.getByRole('button', { name: '关闭详情' }).click()
await wait(600)
await page.getByLabel('搜索联系人').fill('')
await wait(2200)

const video = page.video()
await page.close()
await video.saveAs('docs/demo/contacthub-demo.webm')
await context.close()
await browser.close()
console.log('Demo video written to docs/demo/contacthub-demo.webm')
