// One-off helper to delete a smoke-test user created while verifying signup works.
// Usage: node scripts/cleanup-test-user.js /path/to/local.env <userId>
const fs = require('fs');
const { Client, Users } = require('node-appwrite');

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

const [envFilePath, userId] = process.argv.slice(2);
if (!envFilePath || !userId) {
  console.error('Usage: node scripts/cleanup-test-user.js /path/to/local.env <userId>');
  process.exit(1);
}
const env = loadEnvFile(envFilePath);
const client = new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY);
const users = new Users(client);

users
  .delete({ userId })
  .then(() => console.log('deleted test user', userId))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
