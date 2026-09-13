// rowSecurity/fileSecurity only scope read/update/delete on rows & files that already exist.
// Creating a NEW row/file is governed by table/bucket-level "create" permission, which the
// initial setup script never granted — hence the 401s on createRow/createFile. This adds
// Permission.create(Role.users()) at the table/bucket level so any signed-in user can create
// their own rows/files; per-row/per-file permissions (already set at creation time in the app
// code) still govern who can read/update/delete each one afterward.
// Usage: node scripts/fix-create-permissions.js /path/to/local.env
const fs = require('fs');
const { Client, TablesDB, Storage, Permission, Role } = require('node-appwrite');

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
  console.error('Usage: node scripts/fix-create-permissions.js /path/to/local.env');
  process.exit(1);
}
const env = loadEnvFile(envFilePath);
const client = new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const DATABASE_ID = 'gravador';
const TABLE_IDS = ['user_settings', 'recordings', 'recording_segments'];
const BUCKET_ID = 'recording-audio';

async function main() {
  const createPermission = [Permission.create(Role.users())];

  for (const tableId of TABLE_IDS) {
    const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    // The installed SDK's types mark `name` optional on updateTable, but this server version
    // (1.8.1) rejects the request without it — pass the table's current name back explicitly.
    await tablesDB.updateTable({ databaseId: DATABASE_ID, tableId, name: table.name, permissions: createPermission, rowSecurity: true });
    console.log('updated table:', tableId);
  }

  const bucket = await storage.getBucket({ bucketId: BUCKET_ID });
  await storage.updateBucket({
    bucketId: BUCKET_ID,
    name: bucket.name,
    permissions: createPermission,
    fileSecurity: true,
    maximumFileSize: bucket.maximumFileSize,
    allowedFileExtensions: bucket.allowedFileExtensions,
  });
  console.log('updated bucket:', BUCKET_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
