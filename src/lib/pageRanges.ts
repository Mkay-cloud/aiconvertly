export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  }

  const indices = new Set<number>();

  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = part.match(/^(\d+)$/);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end > pageCount || start > end) {
        throw new Error(
          `"${part}" is not a valid range for a ${pageCount}-page document`
        );
      }
      for (let page = start; page <= end; page += 1) {
        indices.add(page - 1);
      }
    } else if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (page < 1 || page > pageCount) {
        throw new Error(
          `Page ${page} is out of range for a ${pageCount}-page document`
        );
      }
      indices.add(page - 1);
    } else {
      throw new Error(`"${part}" isn't a valid page or range`);
    }
  }

  if (indices.size === 0) {
    throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  }

  return Array.from(indices).sort((a, b) => a - b);
}
