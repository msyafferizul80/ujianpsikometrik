import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { answers, questions } = await req.json();

        // 1. Prepare Data for AI
        // We need to map Question Text + User Answer Text.
        // Input `questions` should be the list of Question Objects.
        // Input `answers` is Record<id, answerLabel>.

        // Filter only answered questions
        const answeredQuestions = questions.filter((q: any) => answers[q.id]);

        // Construct a simplified text representation to save tokens
        const analysisText = answeredQuestions.map((q: any) => {
            const userAnsLabel = answers[q.id];
            const userAnsText = q.options.find((o: any) => o.label === userAnsLabel)?.text || "";
            return `Q${q.id} (${q.teras}): "${q.question}" -> Answer: "${userAnsText}"`;
        }).join("\n");

        if (!analysisText) {
            return NextResponse.json({ inconsistencies: [] });
        }

        // 2. Prompt Engineering
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        Act as a Professional Psychometric Auditor for a Government Exam (Malaysia SPA Standard).
        
        Analyze the following list of Question-Answer pairs from a candidate.
        Identify if there are any psychological contradictions or inconsistencies where the candidate is "faking" a persona.
        
        Focus on these traits:
        - Social vs Loner (Introvert/Extrovert)
        - Leadership vs Follower
        - Emotional Stability vs Anxiety
        - Rule-following vs Rebellious
        
        List of Q&A:
        ${analysisText}
        
        Return ONLY a JSON array of objects. No markdown. No conversational text.
        Format:
        [
            {
                "question1_id": 12,
                "question2_id": 45,
                "reason": "In Q1 candidate claims to love parties, but in Q45 claims to hate crowds.",
                "severity": "HIGH" | "MEDIUM"
            }
        ]
        
        If no inconsistencies found, return [].
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean up markdown block if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const inconsistencies = JSON.parse(text);

        return NextResponse.json({ inconsistencies });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze consistency" }, { status: 500 });
    }
}
