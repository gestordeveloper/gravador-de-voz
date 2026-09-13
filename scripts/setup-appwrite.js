// One-off provisioning script for the self-hosted Appwrite instance backing this app.
// Run by pointing at a local KEY=VALUE env file (kept out of the repo) so the secret API key
// never appears in shell history/process listings:
//   node scripts/setup-appwrite.js /path/to/local.env
// That file should define APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.
// Idempotent: safe to re-run, existing resources are left as-is.

const fs = require('fs');
const { Client, TablesDB, Storage, TablesDBIndexType } = require('node-appwrite');

function loadEnvFile(path) {
  const contents = fs.readFileSync(path, 'utf8');
  const vars = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const envFilePath = process.argv[2];
if (!envFilePath) {
  console.error('Usage: node scripts/setup-appwrite.js /path/to/local.env');
  process.exit(1);
}
const envFromFile = loadEnvFile(envFilePath);

const ENDPOINT = envFromFile.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = envFromFile.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const API_KEY = envFromFile.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY in the env file.');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const DATABASE_ID = 'gravador';
const SETTINGS_TABLE_ID = 'user_settings';
const RECORDINGS_TABLE_ID = 'recordings';
const SEGMENTS_TABLE_ID = 'recording_segments';
const BUCKET_ID = 'recording-audio';
const MAX_SEGMENT_FILE_BYTES = 30_000_000; // server hard cap; still ~10MB of margin over ~18-19MB/segment

async function ignoreConflict(label, fn) {
  try {
    await fn();
    console.log(`created: ${label}`);
  } catch (error) {
    if (error?.code === 409) {
      console.log(`already exists, skipping: ${label}`);
      return;
    }
    console.error(`FAILED: ${label}`);
    throw error;
  }
}

async function waitForColumns(tableId, expectedKeys) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const { columns } = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId });
    const byKey = new Map(columns.map((c) => [c.key, c.status]));
    const notReady = expectedKeys.filter((key) => byKey.get(key) !== 'available');
    if (notReady.length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for columns to become available on ${tableId}`);
}

async function main() {
  await ignoreConflict(`database ${DATABASE_ID}`, () =>
    tablesDB.create({ databaseId: DATABASE_ID, name: 'Gravador IA' }),
  );

  // --- user_settings: one row per user ($id = userId), all columns optional since a row can be
  // created with just whatever single field the user touched first.
  await ignoreConflict(`table ${SETTINGS_TABLE_ID}`, () =>
    tablesDB.createTable({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, name: 'User settings', rowSecurity: true }),
  );
  const settingsColumns = [
    ['transcriptionProvider', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'transcriptionProvider', size: 32, required: false })],
    ['summaryProvider', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'summaryProvider', size: 32, required: false })],
    ['transcriptionLanguage', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'transcriptionLanguage', size: 16, required: false })],
    ['transcriptionModelsJson', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'transcriptionModelsJson', size: 2000, required: false })],
    ['summaryModelsJson', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'summaryModelsJson', size: 2000, required: false })],
    ['groqApiKey', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'groqApiKey', size: 512, required: false, encrypt: true })],
    ['openaiApiKey', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'openaiApiKey', size: 512, required: false, encrypt: true })],
    ['anthropicApiKey', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'anthropicApiKey', size: 512, required: false, encrypt: true })],
    ['openrouterApiKey', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SETTINGS_TABLE_ID, key: 'openrouterApiKey', size: 512, required: false, encrypt: true })],
  ];
  for (const [key, create] of settingsColumns) {
    await ignoreConflict(`${SETTINGS_TABLE_ID}.${key}`, create);
  }

  // --- recordings: one row per recording, owned by its creator.
  await ignoreConflict(`table ${RECORDINGS_TABLE_ID}`, () =>
    tablesDB.createTable({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, name: 'Recordings', rowSecurity: true }),
  );
  const recordingsColumns = [
    ['title', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'title', size: 256, required: true })],
    ['createdAt', () => tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'createdAt', required: true })],
    ['durationMillis', () => tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'durationMillis', required: true })],
    ['transcript', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'transcript', size: 1000000, required: false })],
    ['transcriptProvider', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'transcriptProvider', size: 32, required: false })],
    ['transcriptStatus', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'transcriptStatus', size: 16, required: true })],
    ['transcriptError', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'transcriptError', size: 2000, required: false })],
    ['summary', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'summary', size: 1000000, required: false })],
    ['summaryProvider', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'summaryProvider', size: 32, required: false })],
    ['summaryStatus', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'summaryStatus', size: 16, required: true })],
    ['summaryError', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'summaryError', size: 2000, required: false })],
    ['userId', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'userId', size: 64, required: true })],
  ];
  for (const [key, create] of recordingsColumns) {
    await ignoreConflict(`${RECORDINGS_TABLE_ID}.${key}`, create);
  }
  await waitForColumns(RECORDINGS_TABLE_ID, ['userId', 'createdAt']);
  await ignoreConflict(`${RECORDINGS_TABLE_ID} idx_userId`, () =>
    tablesDB.createIndex({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'idx_userId', type: TablesDBIndexType.Key, columns: ['userId'] }),
  );
  await ignoreConflict(`${RECORDINGS_TABLE_ID} idx_createdAt`, () =>
    tablesDB.createIndex({ databaseId: DATABASE_ID, tableId: RECORDINGS_TABLE_ID, key: 'idx_createdAt', type: TablesDBIndexType.Key, columns: ['createdAt'] }),
  );

  // --- recording_segments: one row per ~20min audio chunk, points at a Storage file.
  await ignoreConflict(`table ${SEGMENTS_TABLE_ID}`, () =>
    tablesDB.createTable({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, name: 'Recording segments', rowSecurity: true }),
  );
  const segmentsColumns = [
    ['recordingId', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'recordingId', size: 64, required: true })],
    ['index', () => tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'index', required: true })],
    ['fileId', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'fileId', size: 64, required: true })],
    ['durationMillis', () => tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'durationMillis', required: true })],
    ['transcript', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'transcript', size: 1000000, required: false })],
    ['transcriptStatus', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'transcriptStatus', size: 16, required: true })],
    ['transcriptError', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'transcriptError', size: 2000, required: false })],
    ['userId', () => tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'userId', size: 64, required: true })],
  ];
  for (const [key, create] of segmentsColumns) {
    await ignoreConflict(`${SEGMENTS_TABLE_ID}.${key}`, create);
  }
  await waitForColumns(SEGMENTS_TABLE_ID, ['recordingId']);
  await ignoreConflict(`${SEGMENTS_TABLE_ID} idx_recordingId`, () =>
    tablesDB.createIndex({ databaseId: DATABASE_ID, tableId: SEGMENTS_TABLE_ID, key: 'idx_recordingId', type: TablesDBIndexType.Key, columns: ['recordingId'] }),
  );

  // --- Storage bucket for the audio segments themselves.
  await ignoreConflict(`bucket ${BUCKET_ID}`, () =>
    storage.createBucket({
      bucketId: BUCKET_ID,
      name: 'Recording audio',
      fileSecurity: true,
      maximumFileSize: MAX_SEGMENT_FILE_BYTES,
      allowedFileExtensions: ['m4a', 'webm'],
    }),
  );

  console.log('\nDone. Resolved IDs:');
  console.log({ DATABASE_ID, SETTINGS_TABLE_ID, RECORDINGS_TABLE_ID, SEGMENTS_TABLE_ID, BUCKET_ID });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
