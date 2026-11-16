import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('docs/screenshots', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const messages = []
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    messages.push(`${message.type()}: ${message.text()}`)
  }
})
page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`))
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true })
console.log('title:', await page.title())
console.log('cards:', await page.locator('.contact-card').count())
console.log('body width:', await page.evaluate(() => document.body.scrollWidth))
console.log('messages:', JSON.stringify(messages, null, 2))
await browser.close()
