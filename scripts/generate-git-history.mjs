import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const windowsGit = 'C:/Program Files/Git/cmd/git.exe'
const gitBin =
  process.env.GIT_BIN ??
  (process.platform === 'win32' && existsSync(windowsGit) ? windowsGit : 'git')

function git(args) {
  return execFileSync(gitBin, args, { encoding: 'utf8' }).trim()
}

const log = git(['log', '--date=format:%m-%d %H:%M', '--pretty=format:%ad%x09%an%x09%s'])
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [date, author, subject] = line.split('\t')
    return { date, author, subject }
  })

const shortlog = git(['shortlog', '-sn', '--all'])
const total = log.length
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const commits = log
  .map(
    (commit, index) => `
      <div class="commit">
        <div class="rail"><span class="dot ${index === 0 ? 'latest' : ''}"></span></div>
        <div class="date">${escape(commit.date)}</div>
        <div class="subject">${escape(commit.subject)}</div>
        <div class="author">${escape(commit.author)}</div>
      </div>`,
  )
  .join('')

const shortlogRows = shortlog
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/)
    return match ? { commits: Number(match[1]), name: match[2] } : null
  })
  .filter(Boolean)

const maxCommits = Math.max(...shortlogRows.map((row) => row.commits), 1)
const contributorRows = shortlogRows
  .map(
    (row) => `
      <div class="contributor">
        <div class="contributor-head">
          <span class="avatar">${escape(row.name.slice(0, 1).toUpperCase())}</span>
          <strong>${escape(row.name)}</strong>
          <span class="count">${row.commits} commits</span>
        </div>
        <div class="bar"><span style="width:${Math.round((row.commits / maxCommits) * 100)}%"></span></div>
        <div class="ratio">${Math.round((row.commits / total) * 100)}% of all commits</div>
      </div>`,
  )
  .join('')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 1240px;
    height: 760px;
    padding: 34px;
    background:
      radial-gradient(circle at 82% 4%, rgba(220,232,173,.09), transparent 25%),
      #101d18;
    color: #e9e6d9;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  }
  .terminal {
    height: 100%;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px;
    background: #0b1713;
    box-shadow: 0 30px 80px rgba(0,0,0,.38);
  }
  .titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 18px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    background: rgba(255,255,255,.035);
  }
  .dot-red, .dot-yellow, .dot-green { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #d96c58; }
  .dot-yellow { background: #d8ad5e; }
  .dot-green { background: #83a96f; }
  .title {
    margin-left: 8px;
    color: rgba(239,237,226,.43);
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 11px;
  }
  .badge {
    margin-left: auto;
    padding: 4px 9px;
    border: 1px solid rgba(220,232,173,.18);
    border-radius: 6px;
    background: rgba(220,232,173,.07);
    color: #dce8ad;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .12em;
  }
  .content { display: grid; grid-template-columns: minmax(0,1fr) 280px; height: calc(100% - 44px); }
  .main { padding: 22px 24px 18px; border-right: 1px solid rgba(255,255,255,.07); }
  .prompt { margin-bottom: 18px; font-family: "Cascadia Code", Consolas, monospace; font-size: 11px; color: rgba(239,237,226,.48); }
  .prompt b { color: #dce8ad; font-weight: 500; }
  .commit {
    display: grid;
    grid-template-columns: 22px 88px minmax(0,1fr) 90px;
    align-items: center;
    min-height: 47px;
    border-bottom: 1px solid rgba(255,255,255,.045);
  }
  .rail { position: relative; align-self: stretch; display: flex; justify-content: center; }
  .rail::before {
    content: "";
    position: absolute;
    top: 0; bottom: 0;
    width: 1px;
    background: rgba(220,232,173,.16);
  }
  .dot {
    position: relative;
    z-index: 1;
    width: 9px; height: 9px;
    margin-top: 19px;
    border: 2px solid #0b1713;
    border-radius: 50%;
    background: #547d67;
    box-shadow: 0 0 0 1px rgba(220,232,173,.32);
  }
  .dot.latest { background: #dce8ad; box-shadow: 0 0 12px rgba(220,232,173,.55); }
  .date { color: rgba(239,237,226,.36); font-family: "Cascadia Code", Consolas, monospace; font-size: 10px; }
  .subject { overflow: hidden; padding-right: 14px; color: rgba(250,248,240,.9); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
  .author { color: rgba(220,232,173,.45); font-family: "Cascadia Code", Consolas, monospace; font-size: 9px; text-align: right; }
  .side { display: flex; flex-direction: column; padding: 22px 20px; background: rgba(255,255,255,.018); }
  .side h2 {
    margin: 0 0 5px;
    color: rgba(250,248,240,.92);
    font-family: Georgia, "Songti SC", serif;
    font-size: 17px;
  }
  .side p { margin: 0 0 18px; color: rgba(239,237,226,.35); font-size: 9px; line-height: 1.6; }
  .contributor { padding: 12px 0; border-top: 1px solid rgba(255,255,255,.06); }
  .contributor-head { display: flex; align-items: center; gap: 7px; }
  .avatar {
    display: grid; width: 27px; height: 27px; place-items: center;
    border-radius: 8px;
    background: linear-gradient(135deg,#dce8ad,#6fae9c);
    color: #123c32; font-weight: 800; font-size: 11px;
  }
  .contributor-head strong { color: rgba(250,248,240,.88); font-size: 11px; }
  .count { margin-left: auto; color: rgba(220,232,173,.6); font-family: "Cascadia Code", Consolas, monospace; font-size: 8.5px; }
  .bar { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.06); }
  .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#7e9f6a,#dce8ad); }
  .ratio { margin-top: 5px; color: rgba(239,237,226,.3); font-size: 8px; }
  .command {
    margin-top: auto;
    padding: 11px 12px;
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 8px;
    background: rgba(0,0,0,.16);
    color: rgba(239,237,226,.4);
    font-family: "Cascadia Code", Consolas, monospace;
    font-size: 8.5px;
    line-height: 1.8;
  }
  .command b { color: #dce8ad; font-weight: 400; }
  .foot {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    color: rgba(239,237,226,.22);
    font-size: 8px;
    letter-spacing: .05em;
  }
</style>
</head>
<body>
  <div class="terminal">
    <div class="titlebar">
      <span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span>
      <span class="title">acedir@luma: ~/contacthub — git log</span>
      <span class="badge">LOCAL REPOSITORY</span>
    </div>
    <div class="content">
      <div class="main">
        <div class="prompt"><b>~/contacthub</b> $ git log --graph --pretty=format:'%ad  %s' --date=short</div>
        ${commits}
      </div>
      <div class="side">
        <h2>Contributors</h2>
        <p>提交统计来自本地 Git 历史。推送到 GitHub 后，可替换为 Insights 页面截图。</p>
        ${contributorRows}
        <div class="command">
          <div>$ <b>git shortlog -sn --all</b></div>
          ${shortlogRows.map((row) => `<div>${row.commits}&nbsp;&nbsp;${escape(row.name)}</div>`).join('')}
        </div>
        <div class="foot"><span>${total} COMMITS</span><span>${shortlogRows.length} CONTRIBUTOR</span></div>
      </div>
    </div>
  </div>
</body>
</html>`

await mkdir('docs/screenshots', { recursive: true })
await writeFile('docs/git-history.html', html, 'utf8')

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1240, height: 760 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.screenshot({ path: 'docs/screenshots/git-history.png' })
await browser.close()
console.log(`Rendered ${total} commits and ${shortlogRows.length} contributor(s) to docs/screenshots/git-history.png`)
