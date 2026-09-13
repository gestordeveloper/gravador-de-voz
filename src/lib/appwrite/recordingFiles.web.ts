import { ID, Permission, Role, storage } from '@/lib/appwrite/client';
import { APPWRITE_BUCKET_ID } from '@/lib/appwrite/config';

export async function uploadSegmentFile(uri: string, userId: string, index: number): Promise<string> {
  const blob = await fetch(uri).then((response) => response.blob());
  const file = new File([blob], `segment-${index}.webm`, { type: blob.type || 'audio/webm' });
  const uploaded = await storage.createFile({
    bucketId: APPWRITE_BUCKET_ID,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.user(userId)), Permission.write(Role.user(userId)), Permission.delete(Role.user(userId))],
  });
  return uploaded.$id;
}

// No persistent local file on web — the recorder's blob: URL is garbage-collected once nothing
// references it anymore, so there's nothing to clean up here.
export function deleteLocalSegmentFile(_uri: string): void {}

export function getSegmentFileUrl(fileId: string): string {
  return storage.getFileView({ bucketId: APPWRITE_BUCKET_ID, fileId });
}

export async function deleteSegmentFile(fileId: string): Promise<void> {
  await storage.deleteFile({ bucketId: APPWRITE_BUCKET_ID, fileId });
}
