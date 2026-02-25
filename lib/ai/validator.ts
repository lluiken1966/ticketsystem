import Anthropic from "@anthropic-ai/sdk";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { AiValidation } from "@/src/db/entities/AiValidation";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ValidationResult {
  is_complete: boolean;
  feedback: string;
}

export async function validateTicket(ticketId: number): Promise<void> {
  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

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
