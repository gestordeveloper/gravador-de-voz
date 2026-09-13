import { Account, AppwriteException, Client, ID, Permission, Query, Role, Storage, TablesDB } from 'appwrite';

import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@/lib/appwrite/config';

// Web platform is registered by hostname in the Appwrite Console, not via setPlatform().
export const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
// TablesDB is the current (non-deprecated) Appwrite data API, replacing Databases/Documents.
// Requires a self-hosted Appwrite server on 1.8+. If the instance predates that, swap this for
// `new Databases(client)` and use createDocument/getDocument/updateDocument instead.
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export { AppwriteException, ID, Permission, Query, Role };
