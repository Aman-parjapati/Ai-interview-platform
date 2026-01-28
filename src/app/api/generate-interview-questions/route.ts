import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("[INFO] generate-interview-questions (Groq) request received");

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY missing");
    }

    const body = await req.json();

    const prompt = `
You are an AI interviewer.

Generate ${body.numberOfQuestions || 5} interview questions for a ${
      body.role || "software"
    } role.

Objective:
${body.objective || "Assess candidate skills"}

Return ONLY a numbered list of questions.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 400,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Groq error");
    }

    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.delta?.content ||
      "";

    if (!text.trim()) {
      throw new Error("Empty AI response");
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[ERROR] generate-interview-questions", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
