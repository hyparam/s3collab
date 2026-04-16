import { marked } from 'marked'
import { demoMarkdown } from './example.js'

const demoHtml = marked.parse(demoMarkdown, { async: false, breaks: true, gfm: true })

/**
 * @param {HTMLElement} el
 * @param {string} markdown
 */
export function renderPreview(el, markdown) {
  if (markdown) {
    el.classList.remove('demo')
    el.innerHTML = marked.parse(markdown, { async: false, breaks: true, gfm: true })
  } else {
    el.classList.add('demo')
    el.innerHTML = demoHtml
  }
}
