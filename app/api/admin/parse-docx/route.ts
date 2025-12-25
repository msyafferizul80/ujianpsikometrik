import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: Request) {
    console.log("Processing File Upload Request...");
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.error("No file found in form data");
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`File received: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

        // Handle JSON direct upload
        if (file.name.endsWith('.json') || file.type === 'application/json') {
            // ... (JSON handling same as before)
            console.log("Parsing JSON file...");
            const text = await file.text();
            try {
                const json = JSON.parse(text);
                if (Array.isArray(json)) {
                    return NextResponse.json({ success: true, data: json });
                } else if (json.questions && Array.isArray(json.questions)) {
                    return NextResponse.json({ success: true, data: json.questions });
                }
            } catch (jsonErr) {
                return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
            }
        }

        let text = "";

        // Handle Plain Text (Copied & Pasted)
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            text = await file.text();
        }
        // Handle DOCX
        else {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        }

        if (!text) {
            return NextResponse.json({ error: 'Tiada teks dijumpai.' }, { status: 400 });
        }


        console.log("Raw Text Sample:", text.substring(0, 100));

        // --- Improved Parsing Logic (Custom Format Support) ---
        const questions = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        let currentQuestion: any = null;
        let parsingState = 'init'; // init, question_text, options, explanation

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 1. Detect New Question (e.g. "Soalan 15", "1.", "Question 1")
            // Strict regex for "Soalan \d" to avoid false positives in text
            const questionStartMatch = line.match(/^(?:Soalan|Question)\s+(\d+)|^(\d+)[\.\)]/i);

            if (questionStartMatch) {
                if (currentQuestion) questions.push(currentQuestion);

                const qNum = questionStartMatch[1] || questionStartMatch[2];
                // We don't take the text immediately if it's just "Soalan 15"
                // The actual question text might be on the next line or after "Soalan:" prefix

                currentQuestion = {
                    id: parseInt(qNum) || questions.length + 1,
                    text: '', // Will populate
                    options: [],
                    correctAnswer: '',
                    answerPoints: {},
                    teras: 'General',
                    explanation: ''
                };
                parsingState = 'question_text';
                continue;
            }

            if (!currentQuestion) continue;

            // 2. Detect "Teras:"
            if (/^Teras\s*[\:\-]/i.test(line)) {
                currentQuestion.teras = line.replace(/^Teras\s*[\:\-]\s*/i, '').trim();
                continue;
            }

            // 3. Detect "Soalan:" prefix (common in this format)
            if (/^Soalan\s*[\:\-]/i.test(line)) {
                // Convert "Soalan: Text..." -> "Text..."
                currentQuestion.text = line.replace(/^Soalan\s*[\:\-]\s*/i, '').trim();
                parsingState = 'question_text';
                continue;
            }

            // 4. Detect "Pilihan Jawapan:" header
            if (/^Pilihan Jawapan[\:\-]/i.test(line)) {
                parsingState = 'options';
                continue;
            }

            // 5. Detect "Cadangan Jawapan Terbaik:" or "Jawapan:"
            if (/^(Cadangan Jawapan Terbaik|Jawapan|Answer)\s*[\:\-]/i.test(line)) {
                const match = line.match(/[\:\-]\s*([A-E])/i);
                if (match) {
                    currentQuestion.correctAnswer = match[1].toUpperCase();
                }
                parsingState = 'meta';
                continue;
            }

            // 6. Detect Explanation Section
            if (/^(Kenapa soalan ini penting|Penerangan Jawapan|Explanation)[\:\-]/i.test(line)) {
                parsingState = 'explanation';
                // Don't continue, simpler to just append line in state handling
            }

            // --- State Handling ---

            if (parsingState === 'question_text') {
                // Check if "Pilihan Jawapan" is hidden inside the question text line
                const inlineSplit = line.match(/(.*)(Pilihan Jawapan[\:\-]\s*.*)/i);
                if (inlineSplit) {
                    // Split found! Part 1 is question text
                    if (inlineSplit[1].trim()) {
                        currentQuestion.text += (currentQuestion.text ? " " : "") + inlineSplit[1].trim();
                    }

                    // Part 2 contains the options header and potentially options themselves
                    const remainder = inlineSplit[2];
                    parsingState = 'options';

                    // Process the remainder line for options immediately
                    // e.g., "Pilihan Jawapan: A Sangat Setuju B Setuju..."
                    const optionMatches = remainder.matchAll(/([A-E])\s+(.*?)(?=(?:[A-E]\s+)|$)/g);
                    for (const match of optionMatches) {
                        currentQuestion.options.push({
                            label: match[1].toUpperCase(),
                            text: match[2].trim().replace(/^(Cadangan|Kenapa).*/i, '') // Safety trim
                        });
                    }
                    continue;
                }

                // If line looks like an option (A. Text), switch state
                if (/^[A-E] [\–\-\.]/.test(line)) {
                    parsingState = 'options';
                    // Fallthrough to options handler
                } else if (!/^Soalan\s+\d+/i.test(line)) {
                    currentQuestion.text += (currentQuestion.text ? " " : "") + line;
                }
            }

            if (parsingState === 'options') {
                // Handle standard multiline options
                // Match "A – Text", "A. Text", "A) Text"
                const optMatch = line.match(/^([A-E])\s*[\.\)\-\–]\s+(.*)/i);
                if (optMatch) {
                    currentQuestion.options.push({
                        label: optMatch[1].toUpperCase(),
                        text: optMatch[2].trim()
                    });
                }
                // Handle inline options if they spill over (e.g. "A Setuju B Tidak Setuju")
                else if (/([A-E])\s+/.test(line) && line.length < 50) {
                    // Simple heuristic for short option lines that might be "B Setuju" without bullet
                    // This is risky, so we keep it strict to A-E start
                }
            }

            if (parsingState === 'explanation') {
                // Append line to explanation
                if (!currentQuestion.explanation) currentQuestion.explanation = "";
                currentQuestion.explanation += (currentQuestion.explanation ? "\n" : "") + line;
            }
        }
        if (currentQuestion) questions.push(currentQuestion);

        // ... Post Processing ...

        if (questions.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Tiada soalan dikesan. Format mungkin tidak dikenali.",
                debug: { rawTextFirst200: text.substring(0, 300) }
            });
        }

        // Post-process points logic based on the user's specific "Best Answer" field
        const processedQuestions = questions.map(q => {
            const points: any = {};
            // Default Logic: Best Answer = 10, Others = 0.
            // ( Ideally we parse "Penerangan Jawapan" to find partial points, but that's complex without AI )
            q.options.forEach((opt: any) => {
                if (opt.label === q.correctAnswer) {
                    points[opt.label] = 10;
                } else {
                    points[opt.label] = 0; // Or standard distribution if we want
                }
            });
            return { ...q, answerPoints: points };
        });

        return NextResponse.json({
            success: true,
            data: processedQuestions,
            debug: { count: processedQuestions.length }
        });

    } catch (e: any) {
        console.error("Server Parse Error:", e);
        return NextResponse.json({ error: "Server Error: " + e.message }, { status: 500 });
    }
}
