import path from 'node:path';
import { TEXT_PREVIEW_EXTENSIONS } from '@/lib/constants';

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function compact<T>(items: (T | null | undefined | false | '')[]): T[] {
  return items.filter(Boolean) as T[];
}

export function splitCommaSeparated(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function incrementVersionNumber(version: string, bump: 'patch' | 'minor' | 'major' = 'patch') {
  const [majorRaw, minorRaw, patchRaw] = version.split('.').map((part) => Number.parseInt(part, 10));
  const major = Number.isFinite(majorRaw) ? majorRaw : 1;
  const minor = Number.isFinite(minorRaw) ? minorRaw : 0;
  const patch = Number.isFinite(patchRaw) ? patchRaw : 0;

  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

export function sanitizeFilename(value: string) {
  const ext = path.extname(value).toLowerCase();
  const base = path.basename(value, ext).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'file'}${ext}`;
}

export function isProbablyTextFile(fileName: string, mimeType?: string | null) {
  if (mimeType?.startsWith('text/')) return true;
  if (mimeType?.includes('json') || mimeType?.includes('xml') || mimeType?.includes('javascript')) return true;
  const ext = path.extname(fileName).toLowerCase();
  return TEXT_PREVIEW_EXTENSIONS.includes(ext as (typeof TEXT_PREVIEW_EXTENSIONS)[number]);
}

export function extractTextPreview(buffer: Buffer, maxBytes = 20 * 1024) {
  return buffer
    .subarray(0, Math.min(maxBytes, buffer.length))
    .toString('utf8')
    .replace(/\u0000/g, '')
    .trim();
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSourceModeLabel(mode: 'MANUAL' | 'UPLOAD_BUNDLE') {
  return mode === 'UPLOAD_BUNDLE' ? 'Uploaded bundle' : 'Web prompt';
}
