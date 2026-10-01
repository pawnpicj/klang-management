/** Semantic, unique HTML IDs for repeated forms and rows. */
export function htmlId(...parts: (string | number)[]) {
  return parts
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, "_"))
    .join("_");
}
