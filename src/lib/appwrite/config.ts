function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada. Copie .env.example para .env e preencha com os dados do seu Appwrite.`,
    );
  }
  return value;
}

export const APPWRITE_ENDPOINT = requireEnv('EXPO_PUBLIC_APPWRITE_ENDPOINT', process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT);
export const APPWRITE_PROJECT_ID = requireEnv(
  'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
);
export const APPWRITE_DATABASE_ID = requireEnv(
  'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
  process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
);
export const APPWRITE_SETTINGS_COLLECTION_ID = requireEnv(
  'EXPO_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID',
  process.env.EXPO_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID,
);
export const APPWRITE_RECORDINGS_COLLECTION_ID = requireEnv(
  'EXPO_PUBLIC_APPWRITE_RECORDINGS_COLLECTION_ID',
  process.env.EXPO_PUBLIC_APPWRITE_RECORDINGS_COLLECTION_ID,
);
export const APPWRITE_SEGMENTS_COLLECTION_ID = requireEnv(
  'EXPO_PUBLIC_APPWRITE_SEGMENTS_COLLECTION_ID',
  process.env.EXPO_PUBLIC_APPWRITE_SEGMENTS_COLLECTION_ID,
);
export const APPWRITE_BUCKET_ID = requireEnv('EXPO_PUBLIC_APPWRITE_BUCKET_ID', process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID);

// iOS/Android platform id registered in the Appwrite Console (Client.setPlatform, native only).
export const APPWRITE_PLATFORM_ID = 'com.ageb.gravador';
