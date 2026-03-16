/**
 * Normalize common model hallucinations in operation subType values.
 * e.g. "add_rows-by-record-attribute" -> "add-rows-by-record-attribute"
 */
export function normalizeSubType(val: unknown): unknown {
  if (val && typeof val === 'object' && 'subType' in val) {
    const obj = val as Record<string, unknown>;
    if (typeof obj.subType === 'string') {
      return { ...obj, subType: obj.subType.replace(/_/g, '-') };
    }
  }
  return val;
}
