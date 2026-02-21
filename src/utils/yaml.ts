/**
 * YAML serialization (simple, no external deps)
 *
 * Handles the subset of YAML used in K8s manifests.
 */

function serializeArray(arr: unknown[], indent: number): string {
  if (arr.length === 0) return '[]';
  const lines: string[] = [];
  for (const item of arr) {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const inner = toYAML(item, indent + 2);
      const firstLineEnd = inner.indexOf('\n');
      if (firstLineEnd === -1) {
        lines.push(`${pad(indent)}- ${inner}`);
      } else {
        const first = inner.slice(0, firstLineEnd);
        const rest = inner.slice(firstLineEnd + 1);
        const indentedRest = rest.split('\n').map((l) => pad(2) + l).join('\n');
        lines.push(`${pad(indent)}- ${first}\n${indentedRest}`);
      }
    } else {
      lines.push(`${pad(indent)}- ${toYAML(item, indent + 2)}`);
    }
  }
  return lines.join('\n');
}

function serializeObject(obj: Record<string, unknown>, indent: number): string {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '{}';
  const lines: string[] = [];
  for (const [key, value] of entries) {
    if (
      typeof value === 'object' &&
      value !== null &&
      (Array.isArray(value) || Object.keys(value as object).length > 0)
    ) {
      lines.push(`${pad(indent)}${key}:`);
      lines.push(toYAML(value, indent + 2));
    } else {
      lines.push(`${pad(indent)}${key}: ${toYAML(value, 0)}`);
    }
  }
  return lines.join('\n');
}

/**
 * Serialize an object to YAML string
 */
export function toYAML(obj: unknown, indent = 0): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return quoteString(obj);
  if (Array.isArray(obj)) return serializeArray(obj, indent);
  if (typeof obj === 'object') return serializeObject(obj as Record<string, unknown>, indent);
  return String(obj);
}

/**
 * Serialize multiple K8s resources separated by ---
 */
export function toMultiDocYAML(resources: unknown[]): string {
  return resources.map((r) => `---\n${toYAML(r)}`).join('\n');
}

function pad(n: number): string {
  return ' '.repeat(n);
}

function quoteString(s: string): string {
  // Quote if contains special YAML characters or is empty
  if (
    s === '' ||
    s.includes(':') ||
    s.includes('#') ||
    s.includes('\n') ||
    s.includes('"') ||
    s.includes("'") ||
    s.startsWith('{') ||
    s.startsWith('[') ||
    s.startsWith('*') ||
    s.startsWith('&') ||
    s === 'true' ||
    s === 'false' ||
    s === 'null' ||
    s === 'yes' ||
    s === 'no' ||
    /^\d+$/.test(s)
  ) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}
