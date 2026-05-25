/**
 * Generate the next issue key for a project.
 * e.g., project identifier "ENG", current max = 42 → "ENG-43"
 */
export function generateIssueKey(identifier: string, nextNumber: number): string {
  return `${identifier}-${nextNumber}`;
}

/**
 * Parse an issue key into its parts.
 */
export function parseIssueKey(issueKey: string): { identifier: string; number: number } | null {
  const match = issueKey.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;
  return { identifier: match[1], number: parseInt(match[2], 10) };
}
