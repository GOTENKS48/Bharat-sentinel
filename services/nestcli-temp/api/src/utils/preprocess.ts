export function preprocessText(text: string): string {
  return text
    .replace(/http\S+/g, '') // remove URLs
    .replace(/[@#]/g, '')    // remove mentions/hashtags
    .replace(/[^\w\s]/g, '') // remove special chars
    .trim()
    .toLowerCase();
}
