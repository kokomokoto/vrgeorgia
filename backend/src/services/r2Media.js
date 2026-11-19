/**
 * Cloudflare R2 storage (S3-compatible).
 * Used when MEDIA_PROVIDER=r2. Transforms happen on Cloudflare Image Resizing
 * at the edge — not here.
 */
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name} for R2 media`);
  return v;
}

export function isR2Configured() {
  return Boolean(
    process.env.CF_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim() &&
      process.env.R2_PUBLIC_BASE_URL?.trim()
  );
}

let client;

function getClient() {
  if (client) return client;
  const accountId = required('CF_ACCOUNT_ID');
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
  });
  return client;
}

function publicBase() {
  return required('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
}

function keyFromPublicUrl(url) {
  const base = publicBase();
  if (!url || !url.startsWith(base + '/')) return null;
  return decodeURIComponent(url.slice(base.length + 1).split('?')[0]);
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, contentType?: string, ext?: string, key?: string }} [opts]
 * @returns {Promise<string>} public HTTPS URL
 */
export async function uploadBufferToR2(buffer, opts = {}) {
  const folder = (opts.folder || 'vrgeorgia/properties').replace(/^\/+|\/+$/g, '');
  const ext = (opts.ext || 'jpg').replace(/^\./, '');
  const key = (opts.key || `${folder}/${randomUUID()}.${ext}`).replace(/^\/+/, '');
  await getClient().send(
    new PutObjectCommand({
      Bucket: required('R2_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: opts.contentType || 'image/jpeg',
      CacheControl: opts.key
        ? 'public, max-age=86400'
        : 'public, max-age=31536000, immutable',
    })
  );
  return `${publicBase()}/${key}`;
}

/** @returns {Promise<boolean>} */
export async function deleteR2ObjectByUrl(imageUrl) {
  const key = keyFromPublicUrl(imageUrl);
  if (!key) return false;
  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: required('R2_BUCKET'),
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error('R2 delete error:', err.message);
    return false;
  }
}
