import { EventSequence, FrequentPattern } from "../types/sandbox";
import { EventAttribute } from "../types/operations";
import { spawn } from "child_process";
import path from "path";

/**
 * Convert event sequences to format for pattern mining
 * Each sequence becomes an array of event attribute strings
 */
function sequencesToMiningFormat(
  sequences: EventSequence[],
  attributeName: string
): string[][] {
  return sequences.map((seq) =>
    seq.events.map((event) => {
      const value = event[attributeName];
      return `${attributeName}:${value}`;
    })
  );
}

/**
 * Call Python script to mine frequent patterns using PrefixSpan
 * Returns top K frequent patterns
 * Falls back to JS implementation if Python is unavailable
 */
export async function mineFrequentPatterns(
  sequences: EventSequence[],
  attributeName: string,
  topK: number = 10,
  minSupport: number = 0.05
): Promise<FrequentPattern[]> {
  return new Promise((resolve) => {
    // Convert sequences to mining format
    const miningData = sequencesToMiningFormat(sequences, attributeName);

    console.log(`Mining patterns for ${sequences.length} sequences, attribute: ${attributeName}, minSupport: ${minSupport}`);

    // Path to Python script
    const scriptPath = path.join(
      process.cwd(),
      "app",
      "utils",
      "mining_script.py"
    );

    // Spawn Python process

    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    
    const python = spawn(pythonCommand, [
      scriptPath,
      "-", // Signal to read from stdin
      topK.toString(),
      minSupport.toString(),
    ]);

    // Handle spawn error (Python not found) - fall back to JS
    python.on("error", (err) => {
      console.warn("Python not available, using JS fallback for pattern mining:", err.message);
      resolve(mineSimplePatterns(sequences, attributeName, topK));
    });

    // Write data to stdin
    python.stdin.write(JSON.stringify(miningData));
    python.stdin.end();

    let outputData = "";
    let errorData = "";

    python.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        console.warn("Python script failed, using JS fallback:", errorData);
        resolve(mineSimplePatterns(sequences, attributeName, topK));
        return;
      }

      try {
        const patterns = JSON.parse(outputData);
        console.log(`Mined ${patterns.length} patterns`);

        // Convert to FrequentPattern format
        const frequentPatterns: FrequentPattern[] = patterns.map(
          (p: { pattern: string[]; support: number }) => ({
            pattern: p.pattern.map((item: string) => {
              const [attr, value] = item.split(":");
              return {
                attribute: attr,
                value: value,
                negated: false,
              } as EventAttribute;
            }),
            support: p.support,
            percentage: (p.support / sequences.length) * 100,
          })
        );

        resolve(frequentPatterns);
      } catch (error) {
        console.warn("Error parsing Python output, using JS fallback:", error);
        resolve(mineSimplePatterns(sequences, attributeName, topK));
      }
    });
  });
}

/**
 * Fallback: Simple pattern mining without Python
 * Finds most common single-event patterns
 * This is a simplified version for testing when Python is not available
 */
export function mineSimplePatterns(
  sequences: EventSequence[],
  attributeName: string,
  topK: number = 10
): FrequentPattern[] {
  const patternCounts = new Map<string, number>();

  // Count occurrences of each event attribute value
  sequences.forEach((seq) => {
    const seenValues = new Set<string>();
    seq.events.forEach((event) => {
      const value = String(event[attributeName]);
      if (!seenValues.has(value)) {
        seenValues.add(value);
        patternCounts.set(value, (patternCounts.get(value) || 0) + 1);
      }
    });
  });

  // Convert to FrequentPattern format and sort by support
  const patterns: FrequentPattern[] = Array.from(patternCounts.entries())
    .map(([value, support]) => ({
      pattern: [
        {
          attribute: attributeName,
          value: value,
          negated: false,
        },
      ],
      support,
      percentage: (support / sequences.length) * 100,
    }))
    .sort((a, b) => b.support - a.support)
    .slice(0, topK);

  return patterns;
}
