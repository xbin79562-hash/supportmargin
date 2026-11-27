import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type BlogFrontmatter = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  answerCapsule: string;
  tags: string[];
};

export type BlogPost = BlogFrontmatter & {
  content: string;
};

export type ParsedFrontmatter = {
  data: Record<string, string | string[]>;
  content: string;
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const BLOG_DIR = path.resolve(moduleDir, "../content/blog");

function unquote(value: string) {
  const trimmed = value.trim();
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
  if (!hasDoubleQuotes && !hasSingleQuotes) return trimmed;
  return trimmed
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error("Blog file must start with YAML frontmatter.");
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    throw new Error("Blog frontmatter is missing its closing delimiter.");
  }

  const frontmatter = normalized.slice(4, endIndex);
  const content = normalized.slice(endIndex + 5).replace(/^\n/, "");
  const data: Record<string, string | string[]> = {};

  let currentListKey: string | null = null;
  let currentBlock: {
    key: string;
    style: ">" | "|";
    lines: string[];
  } | null = null;

  const flushBlock = () => {
    if (!currentBlock) return;
    const joined =
      currentBlock.style === ">"
        ? currentBlock.lines.join(" ").replace(/\s+/g, " ").trim()
        : currentBlock.lines.join("\n").trim();
    data[currentBlock.key] = joined;
    currentBlock = null;
  };

  for (const line of frontmatter.split("\n")) {
    if (currentBlock) {
      if (line === "" || line.startsWith("  ")) {
        currentBlock.lines.push(line.replace(/^ {2}/, ""));
        continue;
      }
      flushBlock();
      currentListKey = null;
    }

    const listMatch =
      currentListKey !== null && line.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentListKey !== null) {
      const list = data[currentListKey];
      if (Array.isArray(list)) list.push(unquote(listMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;

    currentListKey = null;
    const key = keyMatch[1];
    const value = keyMatch[2].trim();

    if (value === ">" || value === "|") {
      currentBlock = { key, style: value, lines: [] };
      continue;
    }

    if (value === "") {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => unquote(item))
        .filter(Boolean);
      continue;
    }

    data[key] = unquote(value);
  }

  flushBlock();
  return { data, content };
}

function requiredString(
  data: Record<string, string | string[]>,
  key: string,
): string {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Blog frontmatter is missing required field: ${key}`);
  }
  return value;
}

function requiredTags(
  data: Record<string, string | string[]>,
): string[] {
  const value = data.tags;
  if (!Array.isArray(value)) {
    throw new Error("Blog frontmatter is missing required field: tags");
  }
  return value;
}

function readPost(filePath: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontmatter(raw);

  return {
    slug: requiredString(data, "slug"),
    title: requiredString(data, "title"),
    description: requiredString(data, "description"),
    publishedAt: requiredString(data, "publishedAt"),
    updatedAt: requiredString(data, "updatedAt"),
    answerCapsule: requiredString(data, "answerCapsule"),
    tags: requiredTags(data),
    content,
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readPost(path.join(BLOG_DIR, file)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getAllPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function decodeCommonEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function renderInline(value: string) {
  let html = escapeHtml(value);

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, rawUrl: string) => {
      const url = decodeCommonEntities(rawUrl).trim();
      if (/^(javascript|data):/i.test(url)) return label;

      const external = /^(https?:\/\/|www\.)/i.test(url);
      const href = external && url.startsWith("www.") ? `https://${url}` : url;
      const attributes = external
        ? ' target="_blank" rel="sponsored nofollow noopener"'
        : "";

      return `<a href="${escapeAttribute(href)}"${attributes}>${label}</a>`;
    },
  );

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDelimiter(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  return splitTableRow(trimmed).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(rows: string[][]) {
  const [header, ...body] = rows;
  const head = header
    ? `<tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr>`
    : "";
  const bodyRows = body
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<table><thead>${head}</thead><tbody>${bodyRows}</tbody></table>`;
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      output.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      index -= 1;
      output.push(
        `<blockquote>${renderInline(quoteLines.join(" ").replace(/\s+/g, " ").trim())}</blockquote>`,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      index -= 1;
      output.push(
        `<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      index + 1 < lines.length &&
      isTableDelimiter(lines[index + 1])
    ) {
      flushParagraph();
      const rows: string[][] = [splitTableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push(renderTable(rows));
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return output.join("\n");
}
