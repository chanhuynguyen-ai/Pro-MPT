import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { MAX_TEXT_PREVIEW_BYTES } from '@/lib/constants';
import { extractTextPreview, isProbablyTextFile, sanitizeFilename } from '@/lib/utils';

export type StoredAssetInput = {
  file: File;
  repositoryId: string;
};

export type StoredAssetRecord = {
  originalName: string;
  relativePath: string | null;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number;
  isText: boolean;
  previewText: string | null;
};

export type StorageStatus = {
  driver: string;
  available: boolean;
  rootDir?: string;
  bucket?: string;
  endpoint?: string;
};

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
const STORAGE_ROOT_DIR = process.env.STORAGE_ROOT_DIR || path.join(process.cwd(), 'storage', 'repository-assets');
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === '1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || '';

let s3Client: S3Client | null = null;

function getRepositoryStorageDir(repositoryId: string) {
  return path.join(STORAGE_ROOT_DIR, repositoryId);
}

function getRepositoryStoragePrefix(repositoryId: string) {
  return `${repositoryId}/`;
}

function getS3Client() {
  if (s3Client) return s3Client;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 storage is selected but S3 credentials or bucket are missing.');
  }

  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
}

async function streamToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.from('');
  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function ensureRootDir() {
  await mkdir(STORAGE_ROOT_DIR, { recursive: true });
}

async function assertDriverSupported() {
  if (STORAGE_DRIVER === 'local') {
    await ensureRootDir();
    return;
  }
  if (STORAGE_DRIVER === 's3') {
    getS3Client();
    return;
  }
  throw new Error(`Unsupported STORAGE_DRIVER "${STORAGE_DRIVER}".`);
}

export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    await assertDriverSupported();
    if (STORAGE_DRIVER === 'local') {
      await stat(STORAGE_ROOT_DIR).catch(async () => mkdir(STORAGE_ROOT_DIR, { recursive: true }));
      return { driver: STORAGE_DRIVER, rootDir: STORAGE_ROOT_DIR, available: true };
    }

    const client = getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return {
      driver: STORAGE_DRIVER,
      available: true,
      bucket: S3_BUCKET,
      endpoint: S3_ENDPOINT,
    };
  } catch {
    return {
      driver: STORAGE_DRIVER,
      available: false,
      rootDir: STORAGE_DRIVER === 'local' ? STORAGE_ROOT_DIR : undefined,
      bucket: STORAGE_DRIVER === 's3' ? S3_BUCKET : undefined,
      endpoint: STORAGE_DRIVER === 's3' ? S3_ENDPOINT : undefined,
    };
  }
}

export async function clearRepositoryStorage(repositoryId: string) {
  await assertDriverSupported();
  if (STORAGE_DRIVER === 'local') {
    await rm(getRepositoryStorageDir(repositoryId), { recursive: true, force: true }).catch(() => {});
    return;
  }

  const client = getS3Client();
  const prefix = getRepositoryStoragePrefix(repositoryId);
  let continuationToken: string | undefined;
  while (true) {
    const listed = await client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, ContinuationToken: continuationToken }));
    const objects = (listed.Contents || []).map((item) => item.Key).filter(Boolean) as string[];
    if (objects.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: S3_BUCKET,
          Delete: { Objects: objects.map((Key) => ({ Key })) },
        }),
      );
    }
    if (!listed.IsTruncated) break;
    continuationToken = listed.NextContinuationToken;
  }
}

export async function storeUploadedFile({ file, repositoryId }: StoredAssetInput): Promise<StoredAssetRecord> {
  await assertDriverSupported();
  const originalName = sanitizeFilename(file.name || 'file');
  const storedFilename = `${Date.now()}-${randomUUID().slice(0, 8)}-${originalName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const isText = isProbablyTextFile(originalName, file.type);
  const previewText = isText ? extractTextPreview(buffer, MAX_TEXT_PREVIEW_BYTES) : null;

  if (STORAGE_DRIVER === 'local') {
    const storageDir = getRepositoryStorageDir(repositoryId);
    await mkdir(storageDir, { recursive: true });
    const storagePath = path.join(storageDir, storedFilename);
    await writeFile(storagePath, buffer);
    return {
      originalName,
      relativePath: null,
      storagePath,
      mimeType: file.type || null,
      sizeBytes: file.size,
      isText,
      previewText: previewText || null,
    };
  }

  const storagePath = `${getRepositoryStoragePrefix(repositoryId)}${storedFilename}`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: storagePath,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }),
  );

  return {
    originalName,
    relativePath: null,
    storagePath,
    mimeType: file.type || null,
    sizeBytes: file.size,
    isText,
    previewText: previewText || null,
  };
}

export async function writeSeedTextAsset(repositoryId: string, originalName: string, content: string, mimeType = 'text/plain') {
  await assertDriverSupported();
  const cleanName = sanitizeFilename(originalName);
  const storedFilename = `${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;
  const buffer = Buffer.from(content);

  let storagePath: string;
  if (STORAGE_DRIVER === 'local') {
    const storageDir = getRepositoryStorageDir(repositoryId);
    await mkdir(storageDir, { recursive: true });
    storagePath = path.join(storageDir, storedFilename);
    await writeFile(storagePath, content);
  } else {
    storagePath = `${getRepositoryStoragePrefix(repositoryId)}${storedFilename}`;
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: storagePath,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  return {
    originalName: cleanName,
    relativePath: null,
    storagePath,
    mimeType,
    sizeBytes: Buffer.byteLength(content),
    isText: true,
    previewText: content.slice(0, 2000),
  } satisfies StoredAssetRecord;
}

export async function readStoredFile(storagePath: string) {
  await assertDriverSupported();
  if (STORAGE_DRIVER === 'local') return readFile(storagePath);
  const client = getS3Client();
  const response = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: storagePath }));
  return streamToBuffer(response.Body);
}

export async function readStoredText(storagePath: string, fallback = '') {
  await assertDriverSupported();
  const buffer = await readStoredFile(storagePath).catch(() => null);
  if (!buffer) return fallback;
  const raw = buffer.toString('utf8').trim();
  return raw || fallback;
}

export function getStorageConfig() {
  return {
    driver: STORAGE_DRIVER,
    rootDir: STORAGE_ROOT_DIR,
    bucket: S3_BUCKET,
    endpoint: S3_ENDPOINT,
  };
}
