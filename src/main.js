import { bindEditor } from './editor.js'
import { generateKey, isValidKey } from './room-key.js'
import { loadConfig, makeClient } from './s3-client.js'
import { renderPreview } from './preview.js'
import { SyncEngine } from './sync.js'

function noop() {}

/** Entry point. */
async function main() {
  const url = new URL(window.location.href)
  let roomKey = url.searchParams.get('key')
  if (!roomKey || !isValidKey(roomKey)) {
    roomKey = generateKey()
    url.searchParams.set('key', roomKey)
    window.history.replaceState({}, '', url.toString())
  }

  const roomEl = /** @type {HTMLElement} */ (document.getElementById('room'))
  const statusEl = /** @type {HTMLElement} */ (document.getElementById('status'))
  const textarea = /** @type {HTMLTextAreaElement} */ (document.getElementById('editor'))
  const previewEl = /** @type {HTMLElement} */ (document.getElementById('preview'))
  roomEl.textContent = roomKey

  const config = await loadConfig()
  const client = makeClient(config)
  const clientId = crypto.randomUUID()

  /** @type {(text: string) => void} */
  let setRemote = noop

  renderPreview(previewEl, '')

  const engine = new SyncEngine({
    client,
    config,
    roomKey,
    clientId,
    onText(text, source) {
      if (source === 'remote') setRemote(text)
      renderPreview(previewEl, text)
    },
    onStatus(s) { statusEl.textContent = s },
  })

  setRemote = bindEditor(textarea, text => engine.pushLocal(text))

  await engine.start()
}

main().catch(err => {
  console.error(err)
  const statusEl = document.getElementById('status')
  if (statusEl) statusEl.textContent = `error: ${err.message ?? err}`
})
