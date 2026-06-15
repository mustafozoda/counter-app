import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase';

const BUCKET = 'store-media';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
};

const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

function extensionFor(uri: string): string {
  const ext = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri)?.[1]?.toLowerCase();
  return ext && ext.length <= 5 ? ext : 'jpg';
}

/**
 * Upload one local image to the `store-media` bucket and return its public URL.
 *
 * URIs that are already remote (http/https) pass through unchanged, so saving a
 * record whose photos didn't change never re-uploads. Files are namespaced by
 * store id, which also satisfies the storage RLS policies.
 */
export async function uploadImage(localUri: string, storeId: string): Promise<string> {
  if (isRemote(localUri)) return localUri;

  const ext = extensionFor(localUri);
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const path = `${storeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    contentType: CONTENT_TYPES[ext] ?? 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Upload many images in parallel, preserving order. Remote URIs pass through. */
export function uploadImages(uris: string[], storeId: string): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadImage(uri, storeId)));
}
