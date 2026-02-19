export function stripMinimalMarkdown(md: string): string {
  let s = md || "";
  s = s.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  s = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
  s = s.replace(/^#+\s+/gm, "");
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return s;
}

export function deriveStoryTextMetrics(textMarkdown: string) {
  const textPlain = stripMinimalMarkdown(textMarkdown).trim();
  const storyLines = textPlain
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const paragraphCount = textMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  const words = textPlain.match(/\b[\w’'-]+\b/g) ?? [];
  const wordCount = words.length;
  const charCount = textPlain.length;
  const hasSalutation = /^dear\b/i.test(storyLines[0] ?? "");

  return {
    textPlain,
    storyLines,
    paragraphCount,
    wordCount,
    charCount,
    hasSalutation,
  };
}
