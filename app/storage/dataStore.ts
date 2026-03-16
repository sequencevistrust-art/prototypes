import { promises as fs } from "fs";
import path from "path";
import { Event, EventSequence, RecordAttributes } from "../types/sandbox";

/**
 * Global data store for event sequences and record attributes
 */

// --- Cache ---
interface DataCache {
  eventSequencesMap: Map<number, EventSequence>;
  recordAttributesMap: Map<number, RecordAttributes>;
  allEventSequences: EventSequence[];
}

let cache: DataCache | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Convert a CSV row to an Event object
 */
function rowToEvent(row: Record<string, string>): Event {
  const event: Event = {
    eventId: parseInt(row.eventId, 10),
    sessionId: parseInt(row.sessionId, 10),
    timestamp: row.timestamp,
  };

  // Add all other fields dynamically
  Object.keys(row).forEach((key) => {
    if (key !== "eventId" && key !== "sessionId" && key !== "timestamp") {
      const value = row[key];
      // Try to parse as number, otherwise keep as string
      const numValue = parseFloat(value);
      event[key] = isNaN(numValue) ? value : numValue;
    }
  });

  return event;
}

/**
 * Convert a CSV row to a RecordAttributes object
 */
function rowToRecordAttributes(row: Record<string, string>): RecordAttributes {
  const recordAttr: RecordAttributes = {
    sessionId: parseInt(row.sessionId, 10),
  };

  // Add all other fields dynamically
  Object.keys(row).forEach((key) => {
    if (key !== "sessionId") {
      const value = row[key];

      // Try to parse as boolean
      if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
        recordAttr[key] = value.toLowerCase() === "true";
      } else {
        // Try to parse as number
        const numValue = parseFloat(value);
        recordAttr[key] = isNaN(numValue) ? value : numValue;
      }
    }
  });

  return recordAttr;
}

/**
 * Get the data directory
 */
function getDataDir(): string {
  return path.join(process.cwd(), "data");
}

/**
 * Load events from CSV and group into sequences by sessionId
 */
async function loadEventSequences(): Promise<{
  sequencesMap: Map<number, EventSequence>;
  allSequences: EventSequence[];
}> {
  const dataDir = getDataDir();
  const eventsContent = await fs.readFile(
    path.join(dataDir, "events.csv"),
    "utf-8"
  );
  const eventsRows = parseCSV(eventsContent);

  // Group events by sessionId
  const sequenceMap = new Map<number, Event[]>();

  eventsRows.forEach((row) => {
    const event = rowToEvent(row);
    const sessionId = event.sessionId;

    if (!sequenceMap.has(sessionId)) {
      sequenceMap.set(sessionId, []);
    }
    sequenceMap.get(sessionId)!.push(event);
  });

  // Convert to EventSequence objects and sort events by timestamp
  const sequencesMap = new Map<number, EventSequence>();
  const allSequences: EventSequence[] = [];

  sequenceMap.forEach((events, sessionId) => {
    // Sort events by timestamp
    events.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const sequence: EventSequence = {
      sessionId,
      events,
    };

    sequencesMap.set(sessionId, sequence);
    allSequences.push(sequence);
  });

  console.log(`Loaded ${allSequences.length} event sequences`);
  return { sequencesMap, allSequences };
}

/**
 * Load record attributes from CSV
 */
async function loadRecordAttributes(): Promise<
  Map<number, RecordAttributes>
> {
  const dataDir = getDataDir();
  const recordContent = await fs.readFile(
    path.join(dataDir, "record-attributes.csv"),
    "utf-8"
  );
  const recordRows = parseCSV(recordContent);

  const recordMap = new Map<number, RecordAttributes>();

  recordRows.forEach((row) => {
    const recordAttr = rowToRecordAttributes(row);
    recordMap.set(recordAttr.sessionId, recordAttr);
  });

  console.log(`Loaded ${recordMap.size} record attributes`);
  return recordMap;
}

/**
 * Initialize the data store
 */
export async function initializeDataStore(): Promise<void> {
  if (cache) return;

  if (initPromise) {
    return initPromise;
  }

  const promise = (async () => {
    console.log(`Initializing data store...`);
    const start = Date.now();

    const [sequences, recordAttrs] = await Promise.all([
      loadEventSequences(),
      loadRecordAttributes(),
    ]);

    cache = {
      eventSequencesMap: sequences.sequencesMap,
      allEventSequences: sequences.allSequences,
      recordAttributesMap: recordAttrs,
    };

    const duration = Date.now() - start;
    console.log(`Data store initialized in ${duration}ms`);
  })();

  initPromise = promise;
  return promise;
}

function getCache(): DataCache {
  if (!cache) throw new Error(`Data store not initialized`);
  return cache;
}

/**
 * Get all event sequences
 * Automatically initializes if not already done
 */
export async function getAllEventSequences(): Promise<EventSequence[]> {
  await initializeDataStore();
  return getCache().allEventSequences;
}

/**
 * Get event sequence by sessionId
 * Automatically initializes if not already done
 */
export async function getEventSequence(
  sessionId: number
): Promise<EventSequence | undefined> {
  await initializeDataStore();
  return getCache().eventSequencesMap.get(sessionId);
}

/**
 * Get event sequences map
 * Automatically initializes if not already done
 */
export async function getEventSequencesMap(): Promise<
  Map<number, EventSequence>
> {
  await initializeDataStore();
  return getCache().eventSequencesMap;
}

/**
 * Get record attributes by sessionId
 * Automatically initializes if not already done
 */
export async function getRecordAttributes(
  sessionId: number
): Promise<RecordAttributes | undefined> {
  await initializeDataStore();
  return getCache().recordAttributesMap.get(sessionId);
}

/**
 * Get all record attributes map
 * Automatically initializes if not already done
 */
export async function getRecordAttributesMap(): Promise<
  Map<number, RecordAttributes>
> {
  await initializeDataStore();
  return getCache().recordAttributesMap;
}

/**
 * Check if data store is initialized
 */
export function isDataStoreInitialized(): boolean {
  return cache !== null;
}
