import DOMPurify from 'dompurify';

/**
 * Sanitasi string HTML dari konten AI atau pengguna agar aman dari serangan XSS.
 * Memastikan script berbahaya, event handler on*, iframe, dan protocol berbahaya dihilangkan.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  // Jika dipanggil di server-side (Node.js/SSR tanpa DOM window),
  // lakukan fallback escaping aman untuk mencegah crash pada runtime server
  if (typeof window === 'undefined') {
    return dirtyHtml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'code',
      'pre',
      'p',
      'br',
      'hr',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i, // Mencegah protocol javascript:, data:, vbscript:
  });
}
