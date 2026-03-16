import { Mutex } from "async-mutex";

/**
 * Sandbox Lock Manager
 * Manages mutex locks for each sandbox to prevent race conditions
 * when multiple operations try to modify the same sandbox concurrently
 */

// Global storage for locks, one mutex per sandbox ID
const sandboxLocks = new Map<string, Mutex>();

/**
 * Get or create a mutex lock for a specific sandbox
 */
export function getSandboxLock(sandboxId: string): Mutex {
  let lock = sandboxLocks.get(sandboxId);

  if (!lock) {
    lock = new Mutex();
    sandboxLocks.set(sandboxId, lock);
  }

  return lock;
}

/**
 * Clean up the lock for a deleted sandbox
 * Should be called when a sandbox is deleted
 */
export function cleanupSandboxLock(sandboxId: string): void {
  sandboxLocks.delete(sandboxId);
}

/**
 * Clean up all locks
 * Useful for testing or application shutdown
 */
export function cleanupAllSandboxLocks(): void {
  sandboxLocks.clear();
}

/**
 * Get the number of active locks (for monitoring/debugging)
 */
export function getActiveLockCount(): number {
  return sandboxLocks.size;
}

/**
 * Check if a sandbox has an active lock
 */
export function hasSandboxLock(sandboxId: string): boolean {
  return sandboxLocks.has(sandboxId);
}

/**
 * Execute a function with exclusive access to a sandbox
 * Automatically acquires and releases the lock
 *
 * @param sandboxId - The ID of the sandbox to lock
 * @param operation - The async function to execute with the lock held
 * @returns The result of the operation
 *
 * @example
 * const result = await withSandboxLock(sandboxId, async () => {
 *   const sandbox = getSandbox(sandboxId);
 *   // ... modify sandbox
 *   updateSandbox(sandboxId, modifiedSandbox);
 *   return modifiedSandbox;
 * });
 */
export async function withSandboxLock<T>(
  sandboxId: string,
  operation: () => Promise<T>
): Promise<T> {
  const lock = getSandboxLock(sandboxId);
  const release = await lock.acquire();

  try {
    return await operation();
  } finally {
    release();
  }
}
