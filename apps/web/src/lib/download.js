/**
 * Hand a produced file to the browser's own download manager (resumable,
 * survives backgrounding). Never assembles media in JavaScript memory.
 */
import { needsExternalDownload } from './env.js';

export function saveFile(href) {
  if (needsExternalDownload()) {
    // iOS Home Screen app: open in Safari, where downloads work.
    window.open(href, '_blank', 'noopener');
    return 'external';
  }
  // No download attribute: the server's "attachment" header makes real files download, and a
  // failed link shows the server's error page instead of being saved (iPhone saved it as .json).
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'download';
}
