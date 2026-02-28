import Anthropic from "@anthropic-ai/sdk";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { AiValidation } from "@/src/db/entities/AiValidation";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const client = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

interface ValidationResult {
  is_complete: boolean;
  feedback: string;
}

export async function validateTicket(ticketId: number): Promise<void> {
  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  // If no Anthropic key is configured, run a simple deterministic heuristic
  if (!client) {
    const isTitleGood = (ticket.title || "").trim().length >= 10;
    const isDescriptionGood = (ticket.description || "").trim().length >= 30;
    const hasAcceptance = (ticket.acceptanceCriteria || "").trim().length >= 10;
    const hasModule = (ticket.affectedModule || "").trim().length > 0;

    const is_complete = isTitleGood && isDescriptionGood && hasAcceptance && hasModule;
    const feedbackParts: string[] = [];
    if (!isTitleGood) feedbackParts.push("Title is too short or vague.");
    if (!isDescriptionGood) feedbackParts.push("Description lacks detail.");
    if (!hasAcceptance) feedbackParts.push("Missing clear acceptance criteria.");
    if (!hasModule) feedbackParts.push("Affected module is not specified.");
    if (is_complete) feedbackParts.push("Ticket looks reasonably complete based on heuristics.");

    const result: ValidationResult = {
      is_complete,
      feedback: feedbackParts.join(" ") || "No feedback available.",
    };

    const existing = await ds.getRepository(AiValidation).findOne({ where: { ticketId } });
    if (existing) {
      existing.isComplete = result.is_complete ? 1 : 0;
      existing.feedback = result.feedback;
      await ds.getRepository(AiValidation).save(existing);
    } else {
      const validation = ds.getRepository(AiValidation).create({
        ticketId,
        isComplete: result.is_complete ? 1 : 0,
        feedback: result.feedback,
      });
      await ds.getRepository(AiValidation).save(validation);
    }
    return;
  }

  // Full Anthropic-driven flow
  const prompt = `You are a ticket quality reviewer for a software development team.

Evaluate the following ticket for completeness and quality. A good ticket must have:
1. A clear, specific title (not vague like "fix bug" or "update something")
2. A detailed description that explains the problem or requirement clearly
3. Concrete acceptance criteria — testable conditions that define "done"
4. A specific affected module or feature area (not just "the app")

Ticket details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Acceptance Criteria: ${ticket.acceptanceCriteria}
- Affected Module: ${ticket.affectedModule}

Respond ONLY with valid JSON in this exact format:
{
  "is_complete": true or false,
  "feedback": "One or two sentences of specific, actionable feedback. If complete, say what is well defined. If incomplete, explain exactly what is missing."
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let result: ValidationResult;
  try {
    // Extract JSON from response (Claude might add surrounding text)
    const match = responseText.match(/\{[\s\S]*\}/);
    result = JSON.parse(match?.[0] || responseText);
  } catch {
    result = {
      is_complete: false,
      feedback: "AI validation encountered a parsing error. Please review manually.",
    };
  }

  // Save or update validation result
  const existing = await ds.getRepository(AiValidation).findOne({
    where: { ticketId },
  });

  if (existing) {
    existing.isComplete = result.is_complete ? 1 : 0;
    existing.feedback = result.feedback;
    await ds.getRepository(AiValidation).save(existing);
  } else {
    const validation = ds.getRepository(AiValidation).create({
      ticketId,
      isComplete: result.is_complete ? 1 : 0,
      feedback: result.feedback,
    });
    await ds.getRepository(AiValidation).save(validation);
  }
}
