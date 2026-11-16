import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

await mkdir('docs/screenshots', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ deviceScaleFactor: 1 })

const commitsPage = await context.newPage()
await commitsPage.setViewportSize({ width: 1440, height: 1000 })
await commitsPage.goto('https://github.com/Acedir/contacthub/commits/main', {
  waitUntil: 'networkidle',
  timeout: 60000,
})
await commitsPage.waitForTimeout(1000)
await commitsPage.screenshot({ path: 'docs/screenshots/github-commits.png' })

const repoPage = await context.newPage()
await repoPage.setViewportSize({ width: 1440, height: 1100 })
await repoPage.goto('https://github.com/Acedir/contacthub', {
  waitUntil: 'networkidle',
  timeout: 60000,
})
await repoPage.waitForTimeout(800)
await repoPage.screenshot({ path: 'docs/screenshots/github-repository.png' })

await browser.close()
console.log('GitHub screenshots written to docs/screenshots')
