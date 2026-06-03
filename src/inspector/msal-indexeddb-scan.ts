/**
 * MSAL can persist access tokens in IndexedDB; localStorage may only hold key metadata.
 */
import { type MsalScanResult, scanMsalRawEntry, scanMsalStorage } from "./msal-token-scan";

type MsalTokenHandler = (
  audience: "flow" | "powerplatform" | "powerapps" | "any",
  token: string,
) => void;

export type IndexedDbScanMeta = {
  databasesScanned: number;
  entriesScanned: number;
};

function emptyResult(): MsalScanResult {
  return {
    tokensFound: 0,
    accessTokenKeyCount: 0,
    msalKeyCount: 0,
    keysWithSecret: 0,
    keysNoSecret: 0,
    keysExpired: 0,
    keysParseFailed: 0,
    tokenKeyRefsResolved: 0,
    jwtHarvested: 0,
  };
}

function mergeScanResults(into: MsalScanResult, from: MsalScanResult): void {
  into.tokensFound += from.tokensFound;
  into.accessTokenKeyCount += from.accessTokenKeyCount;
  into.msalKeyCount += from.msalKeyCount;
  into.keysWithSecret += from.keysWithSecret;
  into.keysNoSecret += from.keysNoSecret;
  into.keysExpired += from.keysExpired;
  into.keysParseFailed += from.keysParseFailed;
  into.tokenKeyRefsResolved += from.tokenKeyRefsResolved;
  into.jwtHarvested += from.jwtHarvested;
}

function idbGetAll(store: IDBObjectStore): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as unknown[]) ?? []);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function entryToRaw(entry: unknown): string | null {
  if (typeof entry === "string") {
    return entry;
  }
  try {
    return JSON.stringify(entry);
  } catch {
    return null;
  }
}

async function scanDatabase(
  dbName: string,
  onToken: MsalTokenHandler,
  aggregate: MsalScanResult,
  meta: IndexedDbScanMeta,
): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await openDatabase(dbName);
  } catch {
    return;
  }

  meta.databasesScanned += 1;

  try {
    for (const storeName of Array.from(db.objectStoreNames)) {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      let entries: unknown[] = [];
      try {
        entries = await idbGetAll(store);
      } catch {
        continue;
      }

      for (const entry of entries) {
        meta.entriesScanned += 1;
        const raw = entryToRaw(entry);
        if (
          !raw ||
          (!raw.includes("ey") &&
            !raw.toLowerCase().includes("msal") &&
            !raw.toLowerCase().includes("accesstoken"))
        ) {
          continue;
        }
        const partial = emptyResult();
        scanMsalRawEntry(null, raw, `${dbName}:${storeName}`, onToken, partial);
        mergeScanResults(aggregate, partial);
      }
    }
  } finally {
    db.close();
  }
}

export async function scanIndexedDbMsal(
  onToken: MsalTokenHandler,
): Promise<MsalScanResult & IndexedDbScanMeta> {
  const aggregate = emptyResult();
  const meta: IndexedDbScanMeta = { databasesScanned: 0, entriesScanned: 0 };

  let dbNames: string[] = [];
  try {
    const listed = await indexedDB.databases?.();
    dbNames = (listed ?? []).map((db) => db.name).filter((name): name is string => Boolean(name));
  } catch {
    return { ...aggregate, ...meta };
  }

  for (const dbName of dbNames) {
    await scanDatabase(dbName, onToken, aggregate, meta);
  }

  return { ...aggregate, ...meta };
}

export { scanMsalStorage };
