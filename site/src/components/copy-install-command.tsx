'use client';

import { useState } from 'react';

/** Copy-to-clipboard row inside the "Get Started" card on the home page. */
export function CopyInstallCommand({
  command,
  locale,
}: {
  command: string;
  locale: 'en' | 'zh-cn';
}) {
  const [copied, setCopied] = useState(false);
  const zh = locale === 'zh-cn';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const area = document.createElement('textarea');
      area.value = command;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="install-command-copy">
      <div>
        <span className="install-command-eyebrow">
          {zh ? '在终端中执行' : 'Run this in your terminal'}
        </span>
        <div className="install-command-line">
          <code>{command}</code>
        </div>
      </div>
      <button
        type="button"
        className={`install-command-button${copied ? ' install-command-button--copied' : ''}`}
        onClick={copy}
        aria-live="polite"
      >
        {copied ? (zh ? '已复制' : 'Copied') : zh ? '复制' : 'Copy'}
      </button>
    </div>
  );
}
