import { File as LocalFile } from 'expo-file-system';

import { ID, Permission, Role, storage } from '@/lib/appwrite/client';
import { APPWRITE_BUCKET_ID } from '@/lib/appwrite/config';

export async function uploadSegmentFile(uri: string, userId: string, index: number): Promise<string> {
  const localFile = new LocalFile(uri);
  const uploaded = await storage.createFile({
    bucketId: APPWRITE_BUCKET_ID,
    fileId: ID.unique(),
    file: { name: `segment-${index}.m4a`, type: 'audio/m4a', size: localFile.size ?? 0, uri },
    permissions: [Permission.read(Role.user(userId)), Permission.write(Role.user(userId)), Permission.delete(Role.user(userId))],
  });
  return uploaded.$id;
}

// The recorder writes segments to a cache/temp location (see use-recorder.ts) — once a segment
// has been uploaded (for durable storage) and transcribed, the local copy just wastes disk space.
export function deleteLocalSegmentFile(uri: string): void {
  const localFile = new LocalFile(uri);
  if (localFile.exists) {
    localFile.delete();
  }
}

// react-native-appwrite's object-param getFileView() fetches the bytes (Promise<ArrayBuffer>) —
// the URL-only, synchronous equivalent is the positional-only getFileViewURL() helper.
export function getSegmentFileUrl(fileId: string): string {
  return storage.getFileViewURL(APPWRITE_BUCKET_ID, fileId).toString();
}

export async function deleteSegmentFile(fileId: string): Promise<void> {
  await storage.deleteFile({ bucketId: APPWRITE_BUCKET_ID, fileId });
}
