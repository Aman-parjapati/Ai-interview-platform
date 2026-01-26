import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  generateQuestionsPrompt,
} from "@/lib/prompts/generate-questions";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

// ✅ Correct HF router endpoint
const HF_MODEL =
  "https://router.huggingface.co/hf-inference/models/google/flan-t5-large";

export async function POST(req: Request) {
  logger.info("generate-interview-questions (HF) request received");

  try {
    const body = await req.json();

    if (!process.env.HF_API_KEY) {
      throw new Error("HF_API_KEY missing in environment variables");
    }

    const prompt = `
${SYSTEM_PROMPT}

${generateQuestionsPrompt(body)}

Return ONLY valid JSON.
`;

    const response = await fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
        },
      }),
    });

    // 🔥 IMPORTANT: read as TEXT first
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`HF ERROR ${response.status}: ${rawText}`);
    }

    // HF usually returns JSON array, but not guaranteed
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // fallback if model returns plain text
      parsed = rawText;
    }

    const content =
      Array.isArray(parsed) && parsed[0]?.generated_text
        ? parsed[0].generated_text
        : parsed;

    logger.info("Interview questions generated successfully (HF)");

    return NextResponse.json(
      {
        response: content,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("🔥 HF ERROR:", error.message);
    logger.error("Error generating interview questions (HF)");

    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}
