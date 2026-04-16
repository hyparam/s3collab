import { marked } from 'marked'

/**
 * @param {HTMLElement} el
 * @param {string} markdown
 */
export function renderPreview(el, markdown) {
  el.innerHTML = marked.parse(markdown, { async: false, breaks: true, gfm: true })
}
