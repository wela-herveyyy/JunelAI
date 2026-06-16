import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

export function readClipboardText() {
  const os = platform();

  try {
    if (os === 'win32') {
      return execFileSync(
        'powershell',
        ['-NoProfile', '-Command', '[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8; Get-Clipboard -Raw'],
        { encoding: 'utf8' }
      ).trim();
    }

    if (os === 'darwin') {
      return execFileSync('pbpaste', { encoding: 'utf8' }).trim();
    }

    return execFileSync('xclip', ['-selection', 'clipboard', '-o'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
