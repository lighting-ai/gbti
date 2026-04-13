import html2canvas from 'html2canvas'

function waitForImages(root) {
  const imgs = root.querySelectorAll('img')
  return Promise.all(
    [...imgs].map(
      (img) =>
        new Promise((resolve) => {
          if (!img.getAttribute('src')) {
            resolve()
            return
          }
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
          setTimeout(resolve, 4000)
        }),
    ),
  )
}

function sanitizeFileName(s) {
  return String(s || 'result')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function parseHostnameFromSiteOriginEnv() {
  const o = import.meta.env?.VITE_SITE_ORIGIN
  if (typeof o !== 'string' || !o.trim()) return ''
  const s = o.trim()
  try {
    return new URL(s).hostname
  } catch {
    return s.replace(/^https?:\/\//i, '').split('/')[0]?.split(':')[0] || ''
  }
}

/**
 * 导出图底部版权行（© 年份 · 主机名，无协议）；http(s) 下用 location.hostname。
 */
function getShareImageFooterLine() {
  const year = new Date().getFullYear()
  let host = ''
  if (typeof window !== 'undefined') {
    try {
      const { protocol, hostname } = window.location
      if ((protocol === 'http:' || protocol === 'https:') && hostname) {
        host = hostname
      }
    } catch {
      /* ignore */
    }
  }
  if (!host) host = parseHostnameFromSiteOriginEnv()
  if (!host) host = 'gbti.fundpulse.shop'
  return `© ${year} · ${host}`
}

/**
 * 仅在 html2canvas 克隆 DOM 上追加，不影响页面真实布局。
 * @param {HTMLElement} clonedRoot
 */
function appendClonedExportFooter(clonedRoot) {
  const doc = clonedRoot.ownerDocument
  const footer = doc.createElement('div')
  footer.setAttribute('data-share-export-footer', 'true')
  footer.textContent = getShareImageFooterLine()
  footer.style.cssText = [
    'box-sizing:border-box',
    'display:block',
    'width:100%',
    'margin:0',
    'padding:12px 16px 14px',
    'text-align:center',
    'font-size:11px',
    'line-height:1.45',
    'letter-spacing:0.02em',
    'color:#6a7b70',
    'background:#ffffff',
    'border-top:1px solid #e2eae4',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'overflow-wrap:anywhere',
  ].join(';')
  clonedRoot.appendChild(footer)
}

/**
 * @param {HTMLElement} root
 * @returns {Promise<Blob>}
 */
export async function captureShareCardPng(root) {
  if (!root) throw new Error('缺少截图区域')
  await waitForImages(root)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  const scale = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1))

  const canvas = await html2canvas(root, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 20000,
    onclone(_document, clonedElement) {
      appendClonedExportFooter(clonedElement)
    },
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('生成图片失败'))
      },
      'image/png',
      0.92,
    )
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function canSharePngFile() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  )
}

/**
 * @param {{
 *   getRootFull: () => HTMLElement | null
 *   getRootTop: () => HTMLElement | null
 *   getBaseFileName: () => string
 * }} opts
 */
export function initShareCardActions(opts) {
  const saveBtn = document.getElementById('saveShareImageBtn')
  const shareBtn = document.getElementById('shareResultBtn')
  const trigger = document.getElementById('shareMenuTrigger')
  const panel = document.getElementById('shareMenuPanel')
  const fab = document.getElementById('resultShareFab')

  if (!saveBtn || !shareBtn) return

  let menuOpen = false

  function setMenuOpen(open) {
    menuOpen = open
    if (panel && trigger) {
      panel.hidden = !open
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false')
    }
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  if (trigger && panel) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      setMenuOpen(!menuOpen)
    })

    panel.querySelectorAll('[data-share-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.getAttribute('data-share-action')
        closeMenu()
        if (action === 'share-full') await runMenuAction(() => doShareFull())
        else if (action === 'save-full') await runMenuAction(() => doSaveFull())
        else if (action === 'share-top') await runMenuAction(() => doShareTop())
      })
    })

    document.addEventListener('click', (e) => {
      if (!fab?.contains(e.target)) closeMenu()
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu()
    })
  }

  const baseName = () => sanitizeFileName(opts.getBaseFileName())
  const dateStr = () => new Date().toISOString().slice(0, 10)

  function getBusyElements() {
    return [saveBtn, shareBtn, trigger].filter(Boolean)
  }

  async function withBusy(run) {
    const els = getBusyElements()
    els.forEach((el) => {
      el.disabled = true
    })
    try {
      await run()
    } finally {
      els.forEach((el) => {
        el.disabled = false
      })
    }
  }

  async function runMenuAction(fn) {
    if (trigger) trigger.disabled = true
    try {
      await fn()
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error(err)
      alert(`操作失败：${err?.message || err}`)
    } finally {
      if (trigger) trigger.disabled = false
    }
  }

  async function doSaveFull() {
    const root = opts.getRootFull()
    if (!root) throw new Error('找不到完整结果区域')
    const blob = await captureShareCardPng(root)
    downloadBlob(blob, `GBTI-${baseName()}-完整-${dateStr()}.png`)
  }

  async function doShareFull() {
    if (!canSharePngFile()) {
      alert('当前浏览器不支持「分享图片」，请使用「保存结果长图」后从相册分享。')
      return
    }
    const root = opts.getRootFull()
    if (!root) throw new Error('找不到完整结果区域')
    const blob = await captureShareCardPng(root)
    const filename = `GBTI-${baseName()}-完整.png`
    const file = new File([blob], filename, { type: 'image/png' })
    const payload = { files: [file], title: 'GBTI 股民人格测试结果', text: '我的 GBTI 测试结果' }
    if (!navigator.canShare(payload)) {
      alert('当前环境无法分享该图片，请改用「保存结果长图」。')
      return
    }
    await navigator.share(payload)
  }

  async function doShareTop() {
    if (!canSharePngFile()) {
      alert('当前浏览器不支持「分享图片」，请使用「保存结果长图」后自行裁剪，或换用系统浏览器。')
      return
    }
    const root = opts.getRootTop()
    if (!root) throw new Error('找不到角色卡片')
    const blob = await captureShareCardPng(root)
    const filename = `GBTI-${baseName()}-角色卡片.png`
    const file = new File([blob], filename, { type: 'image/png' })
    const payload = {
      files: [file],
      title: 'GBTI 股民人格 · 角色卡片',
      text: '我的 GBTI 测试结果',
    }
    if (!navigator.canShare(payload)) {
      alert('当前环境无法分享该图片，可改用「保存结果长图」。')
      return
    }
    await navigator.share(payload)
  }

  async function onSaveBottom() {
    const label = saveBtn.textContent
    saveBtn.textContent = '生成中…'
    try {
      await withBusy(async () => {
        await doSaveFull()
      })
    } catch (e) {
      console.error(e)
      alert(`导出失败：${e?.message || e}`)
    } finally {
      saveBtn.textContent = label
    }
  }

  async function onShareBottom() {
    const label = shareBtn.textContent
    shareBtn.textContent = '准备中…'
    try {
      await withBusy(async () => {
        await doShareFull()
      })
    } catch (e) {
      if (e?.name === 'AbortError') return
      console.error(e)
      alert(`分享失败：${e?.message || e}`)
    } finally {
      shareBtn.textContent = label
    }
  }

  saveBtn.addEventListener('click', onSaveBottom)
  shareBtn.addEventListener('click', onShareBottom)

  if (!canSharePngFile()) {
    shareBtn.title = '当前环境可能不支持系统分享，可先保存长图'
  }
}
