/**
 * Two-way bind a textarea to the sync engine.
 * Local edits are debounced and pushed; remote updates rewrite the textarea
 * while preserving the caret position by offset-shifting around the diff.
 */

import { diffReplace } from './crdt.js'

const DEBOUNCE_MS = 150

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {(text: string) => Promise<void>} onLocal
 * @returns {(text: string) => void} setter for remote updates
 */
export function bindEditor(textarea, onLocal) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null
  let lastPushed = textarea.value
  let suppress = false

  textarea.addEventListener('input', () => {
    if (suppress) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const { value } = textarea
      if (value === lastPushed) return
      lastPushed = value
      onLocal(value).catch(err => console.error(err))
    }, DEBOUNCE_MS)
  })

  return function setRemote(text) {
    if (text === textarea.value) return
    const prev = textarea.value
    const { selectionStart, selectionEnd } = textarea
    const d = diffReplace(prev, text)
    suppress = true
    textarea.value = text
    if (d) {
      const delta = d.text.length - (d.to - d.from)
      textarea.selectionStart = shift(selectionStart, d.from, d.to, delta)
      textarea.selectionEnd = shift(selectionEnd, d.from, d.to, delta)
    }
    suppress = false
    lastPushed = text
  }
}

/**
 * Shift a caret offset given a replace at [from, to) with net length change delta.
 * @param {number} caret
 * @param {number} from
 * @param {number} to
 * @param {number} delta
 * @returns {number}
 */
function shift(caret, from, to, delta) {
  if (caret <= from) return caret
  if (caret >= to) return caret + delta
  return from
}
