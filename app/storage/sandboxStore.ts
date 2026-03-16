import { Sandbox } from "../types/sandbox";
import { cleanupSandboxLock, cleanupAllSandboxLocks } from "./sandboxLockManager";

/**
 * Global sandbox store
 * Manages all active sandboxes in memory
 */

// Global storage for sandboxes
// Use global object to persist data across HMR in development
const globalForSandboxes = global as unknown as { sandboxes: Map<string, Sandbox> };

if (!globalForSandboxes.sandboxes) {
  globalForSandboxes.sandboxes = new Map<string, Sandbox>();
}

const sandboxes = globalForSandboxes.sandboxes;

/**
 * Generate a unique sandbox ID
 */
export function generateSandboxId(): string {
  return `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create and store a new sandbox
 */
export function createSandbox(sandbox: Sandbox): void {
  sandboxes.set(sandbox.id, sandbox);
}

/**
 * Get a sandbox by ID
 */
export function getSandbox(sandboxId: string): Sandbox | undefined {
  return sandboxes.get(sandboxId);
}

/**
 * Update a sandbox
 */
export function updateSandbox(sandboxId: string, sandbox: Sandbox): void {
  sandboxes.set(sandboxId, sandbox);
}

/**
 * Delete a sandbox and clean up its associated lock
 */
export function deleteSandbox(sandboxId: string): boolean {
  const deleted = sandboxes.delete(sandboxId);
  if (deleted) {
    cleanupSandboxLock(sandboxId);
  }
  return deleted;
}

/**
 * Get all sandbox IDs
 */
export function getAllSandboxIds(): string[] {
  return Array.from(sandboxes.keys());
}

/**
 * Get total number of sandboxes
 */
export function getSandboxCount(): number {
  return sandboxes.size;
}

/**
 * Clear all sandboxes and their associated locks (useful for testing)
 */
export function clearAllSandboxes(): void {
  sandboxes.clear();
  cleanupAllSandboxLocks();
}
