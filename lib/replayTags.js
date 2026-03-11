export function hasSummitTag(tags) {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => {
    const normalized = String(tag || "").trim().toLowerCase();
    return normalized === "summit" || normalized.endsWith(":summit");
  });
}

