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
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.setAttribute('download', '');
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'download';
}
