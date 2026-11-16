import assert from "node:assert/strict";
import { test } from "node:test";
import { generateResumeFeedback } from "../supabase/functions/resume-feedback/feedback.ts";

const feedback = {
  readable: true,
  strengths: ["Shows relevant coursework."],
  improvements: ["Clarify your role on the project."],
  rewrites: ["Built a dashboard for tracking applications."],
};

function completed(value) {
  return Response.json({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }],
  });
}

test("the AI request sends a PDF and parses all three feedback sections", async () => {
  const result = await generateResumeFeedback("cGRm", "test-key", "test-model", async (url, options) => {
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent");
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: "application/pdf", data: "cGRm" });
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    return completed(feedback);
  });
  assert.deepEqual(result, feedback);
});

test("the AI can report an unreadable document", async () => {
  const unreadable = { readable: false, strengths: [], improvements: [], rewrites: [] };
  const result = await generateResumeFeedback("cGRm", "test-key", "test-model", async () => completed(unreadable));
  assert.deepEqual(result, unreadable);
});

test("incomplete or malformed AI output is rejected", async () => {
  await assert.rejects(
    generateResumeFeedback("cGRm", "test-key", "test-model", async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] })),
    /no completed feedback/,
  );
  await assert.rejects(
    generateResumeFeedback("cGRm", "test-key", "test-model", async () => completed({ ...feedback, rewrites: [5] })),
    /unexpected format/,
  );
});
