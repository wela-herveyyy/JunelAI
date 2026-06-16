import { execFile } from 'node:child_process';
import { platform } from 'node:os';

export function openBrowser(url) {
  const os = platform();
  if (os === 'win32') {
    execFile('cmd', ['/c', 'start', '', url], () => {});
    return;
  }
  if (os === 'darwin') {
    execFile('open', [url], () => {});
    return;
  }
  execFile('xdg-open', [url], () => {});
}

export function openLocalFile(filePath) {
  const os = platform();
  const url = `file:///${filePath.replace(/\\/g, '/')}`;
  openBrowser(url);
}
