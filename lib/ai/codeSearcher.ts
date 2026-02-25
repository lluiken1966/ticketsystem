import Anthropic from "@anthropic-ai/sdk";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { AiCodeAnalysis, CodeLocation } from "@/src/db/entities/AiCodeAnalysis";
import { listRepoFiles, filterFilesByKeyword, getFileContent } from "@/lib/bitbucket";
import type { DataSource } from "typeorm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILE_CHARS = 4000; // chars per file to stay within Claude context
const MAX_FILES_TO_ANALYZE = 8;

export async function analyzeCode(ticketId: number): Promise<void> {
  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  // Step 1: Fetch full file list ONCE, then filter locally for each keyword.
  // Previously searchFilesByPath() was called per keyword, causing N full API
  // traversals of the entire repo. Now we paginate once and filter in memory.
  const allFiles = await listRepoFiles(500);
  const keywords = extractKeywords(ticket.affectedModule, ticket.description);

  const candidateFiles: string[] = [];
  for (const kw of keywords) {
    for (const f of filterFilesByKeyword(allFiles, kw)) {
      if (!candidateFiles.includes(f)) candidateFiles.push(f);
      if (candidateFiles.length >= MAX_FILES_TO_ANALYZE) break;
    }
    if (candidateFiles.length >= MAX_FILES_TO_ANALYZE) break;
  }

  if (candidateFiles.length === 0) {
    await saveAnalysis(ds, ticketId, []);
    return;
  }

  // Step 2: Fetch file contents (truncated to stay within Claude context)
  const fileSnippets: { path: string; content: string }[] = [];
  for (const filePath of candidateFiles) {
    try {
      const raw = await getFileContent(filePath);
      fileSnippets.push({ path: filePath, content: raw.slice(0, MAX_FILE_CHARS) });
    } catch {
      // skip unreadable files (binary, missing permissions, etc.)
    }
  }

  if (fileSnippets.length === 0) {
    await saveAnalysis(ds, ticketId, []);
    return;
  }

  // Step 3: Ask Claude to identify relevant code locations
  const fileBlocks = fileSnippets
    .map((f, i) => `=== File ${i + 1}: ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const prompt = `You are a code analysis assistant. Given a software change ticket and several source files, identify the most relevant code locations where changes should be made.

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Acceptance Criteria: ${ticket.acceptanceCriteria}
- Affected Module: ${ticket.affectedModule}

Source files (may be truncated):
${fileBlocks}

For each relevant code location, provide:
- The exact file path (as shown above)
- The starting line number (estimate from the content shown)
- The ending line number
- A clear explanation of why this location is relevant and what change might be needed

Respond ONLY with a valid JSON array (no surrounding text):
[
  {
    "file_path": "path/to/file.ext",
    "start_line": 42,
    "end_line": 58,
    "explanation": "This function handles X which needs to be updated to support Y as described in the ticket."
  }
]

If no relevant locations are found, return an empty array: []`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  let locations: CodeLocation[];
  try {
    const match = responseText.match(/\[[\s\S]*\]/);
    locations = JSON.parse(match?.[0] || "[]");
  } catch {
    locations = [];
  }

  await saveAnalysis(ds, ticketId, locations);
}

async function saveAnalysis(
  ds: DataSource,
  ticketId: number,
  locations: CodeLocation[]
) {
  const repo = ds.getRepository(AiCodeAnalysis);
  const existing = await repo.findOne({ where: { ticketId } });

  if (existing) {
    existing.results = JSON.stringify(locations);
    await repo.save(existing);
  } else {
    const analysis = repo.create({ ticketId, results: JSON.stringify(locations) });
    await repo.save(analysis);
  }
}

function extractKeywords(affectedModule: string, description: string): string[] {
  const text = `${affectedModule} ${description}`.toLowerCase();
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "been", "will", "when", "where",
    "should", "would", "could", "which", "there", "their", "what", "more",
  ]);
  const words = text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  return [...new Set(words)].slice(0, 6);
}
