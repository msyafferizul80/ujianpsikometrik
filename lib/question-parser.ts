
export interface ParsedQuestion {
    id: number;
    question: string;
    options: { label: string; text: string }[];
    correctAnswer: string;
    answerPoints: Record<string, number>;
    teras: string;
    explanation: string;
}

export const parseTextClientSide = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentQuestion: ParsedQuestion | null = null;
    let parsingState = 'init';
    let currentTeras = 'General'; // State to persist Teras across questions

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 0. Detect TERAS Header (Global Context)
        // e.g. "TERAS 1: DISIPLIN (Soalan 1 - 34)"
        const terasMatch = line.match(/^TERAS\s*\d+\s*[\:\-]\s*([A-Z\s]+)/i);
        if (terasMatch) {
            // Extract "DISIPLIN" from "DISIPLIN (Soalan...)"
            const terasRaw = terasMatch[1].trim();
            const cleanTeras = terasRaw.split('(')[0].trim(); // Remove "(Soalan ...)"
            currentTeras = cleanTeras;
            console.log(`Detected Teras: ${currentTeras}`);
            continue;
        }

        // 1. Detect New Question
        // Matches "Soalan 1", "Question 1", "1.", "1)", etc.
        const questionStartMatch = line.match(/^(?:Soalan|Question)\s*(\d+)[\.\:\)]?|^(\d+)[\.\)\-\:](?!\d)/i);

        if (questionStartMatch) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }

            const qNum = questionStartMatch[1] || questionStartMatch[2];
            // Remove the "Soalan 1" prefix
            let qText = line.replace(/^(?:Soalan|Question)\s*\d+[\.\:\)]?\s*|^\d+[\.\)\-\:]\s*/i, '').trim();

            currentQuestion = {
                id: parseInt(qNum) || questions.length + 1,
                question: qText,
                options: [],
                correctAnswer: '',
                answerPoints: {},
                teras: 'General', // Default, will be overridden if Teras line found
                explanation: ''
            };
            parsingState = 'question_text';
            continue;
        }

        if (!currentQuestion) continue;

        // --- NEW: Detect "• Teras: ..." line inside a question block ---
        // Some formats put Teras info here. We can update currentTeras or just set it for this question.
        // ex: "• Teras: Emosi"
        const specificTerasMatch = line.match(/^(?:[\•\-\*]\s*)?Teras\s*[\:\-]\s*(.+)/i);
        if (specificTerasMatch) {
            currentQuestion.teras = specificTerasMatch[1].trim();
            // Update global one too? Maybe not, safer to just update this question unless we want it to carry forward.
            // Let's rely on global one mostly, but if we see this, it overrides.
                        currentTeras = currentQuestion.teras;
            console.log(` Detected Teras: "${currentQuestion.teras}" from line: "${line}"`);
            continue;
        }

        // --- NEW: Detect "• Soalan: ..." line inside a question block ---
        // This is the CRITICAL fix. The user's format has "Soalan 1" (header) AND THEN "• Soalan: actual text".
        // The previous logic blindly appended this line to question text.
        // We want to REPLACE the question text if we see this, or append if it's a continuation?
        // Given the example, "Soalan 1" header line had empty text, or maybe generic text. 
        // Then this line has the REAL text.
        // Matches: "* Soalan: Text...", "• Soalan: Text..."
        const specificSoalanMatch = line.match(/^(?:[\•\-\*]\s*)?Soalan\s*[\:\-]\s*(.+)/i);
        if (specificSoalanMatch) {
            const realQuestionText = specificSoalanMatch[1].trim();
            // If we already have some text (from the header line), we might want to discard it if it was empty or just the number.
            // In the user's case, the header line "Soalan 1" produced empty qText.
            // If qText was just empty, replace it. If it had something, this might be better text.
            currentQuestion.question = realQuestionText;
            parsingState = 'question_text'; // Reset state to text mode
            continue;
        }


        // 2. Detect "Pernyataan:" or "Pernyataan Soalan:" (Append to Question)
        if (/^Pernyataan(?:\s+Soalan)?\s*[\:\-]/i.test(line)) {
            const val = line.replace(/^Pernyataan(?:\s+Soalan)?\s*[\:\-]\s*/i, '').trim();
            if (currentQuestion.question) {
                currentQuestion.question += "\n\n" + val;
            } else {
                currentQuestion.question = val;
            }
            parsingState = 'question_text';
            continue;
        }

        // 3. Detect "Cadangan Jawapan" / "Jawapan"
        // e.g. "Cadangan Jawapan: A. Sangat Setuju" or "Jawapan: A"
        // Also handle "• Cadangan Jawapan Terbaik: A" (User format)
        if (/^(?:[\•\-\*]\s*)?(Cadangan Jawapan|Jawapan|Answer)/i.test(line)) {
            // Look for single letter A-E surrounded by boundary or whitespace/punctuation
            const match = line.match(/([A-E])(?:\s|$)/i);
            if (match) {
                                currentQuestion.correctAnswer = match[1].toUpperCase();
                console.log(` Detected Correct Answer: ${currentQuestion.correctAnswer} from line: "${line}"`);
            }
            parsingState = 'meta';
            continue;
        }

        // 4. Detect Explanation Headers
        // "Kenapa Soalan Ini Penting?", "Kenapa Dalam Teras Disiplin?", "Penerangan Pilihan Jawapan:", "Analisis Pilihan Jawapan"
        // User format: "• Kenapa soalan ini penting: ...", "• Kenapa dalam teras ini: ...", "• Penerangan Jawapan:"
        if (/^(?:[\•\-\*]\s*)?(Kenapa|Penerangan|Explanation|Analisis)/i.test(line)) {
            parsingState = 'explanation';
            // Append header itself to explanation to keep context, stripping the bullet if present for cleaner look?
            // User might want the bullet. Let's keep the line as is but maybe bold it?
            // The previous logic added `**${line}**`.
            if (!currentQuestion.explanation) currentQuestion.explanation = "";
            currentQuestion.explanation += (currentQuestion.explanation ? "\n\n" : "") + `**${line}**`;
            continue;
        }

        // 5. Detect Options
        // User format: "– A – Sangat Setuju"
        // Standard format: "A. Sangat Setuju"
        // Regex needs to handle: 
        // ^ (bullet)? (A-E) (separator) (text)
        const optionMatch = line.match(/^(?:[\•\-\*–]\s*)?([A-E])\s*[\.\)\-\–]\s+(.*)/i);

        // --- State Handling ---

        if (parsingState === 'question_text') {
            if (optionMatch) {
                parsingState = 'options';
            } else if (!/^(Cadangan|Jawapan|Answer|Kenapa|Penerangan|Teras|Soalan)/i.test(line)) {
                // Only append if it doesn't look like a keyword we missed (like "• Pilihan Jawapan:")
                // The user has "• Pilihan Jawapan:" line which is just a header for options. We should ignore it.
                if (/^[\•\-\*]\s*Pilihan Jawapan/i.test(line)) {
                    // Just a header, switch state to options maybe?
                    parsingState = 'options';
                    continue;
                }

                currentQuestion.question += (currentQuestion.question ? "\n" : "") + line;
            }
        }

        if (parsingState === 'options') {
            if (optionMatch) {
                currentQuestion.options.push({
                    label: optionMatch[1].toUpperCase(),
                    text: optionMatch[2].trim()
                });
            } else if (/^[\•\-\*]\s*Pilihan Jawapan/i.test(line)) {
                // Ignore header
            }
        }

        if (parsingState === 'explanation') {
            // Append everything until next keyword
            // We need to be careful not to consume the next "Soalan X" or metadata lines if they lack keywords but we are in explanation mode.
            // But "Soalan X" is handled at the top of loop.
            // We just need to check for other metadata keywords that might appear inside explanation block?
            // Actually, usually explanation is last.
            if (!/^(Cadangan Jawapan|Jawapan|Answer)\s*[\:\-]/i.test(line)) {
                // If we see another known header, we might want to capture it as a new paragraph in explanation
                // e.g. "• Kenapa dalam teras ini:" after "• Kenapa soalan ini penting:"
                // The top-level check for (Kenapa|Penerangan) handles the *State Switch* or *Header Appending*.
                // But if we are IN explanation state, and we see "• Kenapa ...", the Top Level check `if (/^(?:[\•\-\*]\s*)?(Kenapa...` catches it FIRST?
                // Yes, because it is before this block.
                // So if we are here, it's NOT a header.
                currentQuestion.explanation += "\n" + line;
            }
        }
    }
    if (currentQuestion) questions.push(currentQuestion);

    // Score Processing
    return questions.map(q => {
        const points: any = {};
        q.options.forEach((opt: any) => {
            if (opt.label === q.correctAnswer) {
                points[opt.label] = 10;
            } else {
                points[opt.label] = 0;
            }
        });
        // Default points if not set? 
        // User asked for: Exact=10, Close=7, Bad=0.
        // Current parser only does 10 or 0 based on "correctAnswer".
        // The Input text only provides "Cadangan Jawapan Terbaik: A". It doesn't seem to provide the "Close" answer.
        // So we can only support 10/0 for now unless the text provides more info.
        // We'll stick to existing logic for scoring.
        return { ...q, answerPoints: points };
    });
};
