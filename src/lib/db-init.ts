/**
 * Database initialization module.
 * Called once per server process to load persisted data from PostgreSQL.
 *
 * Pattern: Each store registers a loader function here.
 * On first API request, initDbOnce() is called to populate in-memory stores.
 */

let initialized = false;
let initPromise: Promise<void> | null = null;

type Loader = () => Promise<void>;
const loaders: Loader[] = [];

export function registerDbLoader(loader: Loader): void {
  loaders.push(loader);
}

export async function initDbOnce(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      for (const loader of loaders) {
        await loader();
      }
      initialized = true;
      console.log("[db-init] All stores loaded from database");
    } catch (err) {
      console.error("[db-init] Error loading stores:", (err as Error).message);
      initialized = true; // Mark as done even on error to avoid retry loops
    }
  })();

  return initPromise;
}
