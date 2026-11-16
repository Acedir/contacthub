import { chromium } from '@playwright/test'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
await page.goto('https://acedir.github.io/contacthub/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(500)
await page.screenshot({ path: 'docs/screenshots/deployed-site.png', fullPage: false })
await browser.close()
console.log('Captured live GitHub Pages screenshot')
