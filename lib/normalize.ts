const LEGAL_SUFFIXES = new Set([
  "ltd",
  "limited",
  "inc",
  "incorporated",
  "co",
  "llc",
  "plc",
]);

/**
 * Turn a raw client name into a match key:
 * lowercase → punctuation to spaces → collapse whitespace → strip trailing legal
 * suffixes → trim.
 */
export function normalizeName(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  const tokens = base.split(" ");
  // Only strip suffixes from the END, up to twice ("Acme Co Ltd"). Stripping
  // anywhere else would corrupt names where the word is meaningful mid-name
  // ("Co-op Kitchen" → "co op kitchen" must keep its "co").
  for (let i = 0; i < 2; i++) {
    if (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) {
      tokens.pop();
    }
  }
  // tokens.length > 1 guard above: a name that IS just a suffix word ("Co")
  // stays intact — an empty key would exact-match every other empty key.
  return tokens.join(" ");
}
