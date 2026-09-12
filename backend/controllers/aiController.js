const ai = require("../ai/gemini");

// Primary and fallback Gemini models
const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

// Wait before retrying a temporary Gemini error
const wait = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));


// Generate an AI response with retry + fallback handling
const generateAIResponse = async (prompt) => {
    // Try the primary model up to 2 times
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(
                `Trying Gemini model: ${PRIMARY_MODEL} (attempt ${attempt})`
            );

            const result = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: prompt,
            });

            return result.text;
        } catch (error) {
            console.error(
                `Primary model attempt ${attempt} failed:`,
                error.status || error.message
            );

            // Only retry temporary/unavailable errors
            if (error.status !== 503) {
                break;
            }

            // Wait before retrying
            if (attempt < 2) {
                console.log(
                    "Gemini is temporarily unavailable. Retrying..."
                );

                await wait(1500);
            }
        }
    }

    // Primary model failed, so try the fallback model
    try {
        console.log(
            `Trying fallback Gemini model: ${FALLBACK_MODEL}`
        );

        const fallbackResult = await ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents: prompt,
        });

        return fallbackResult.text;
    } catch (fallbackError) {
        console.error(
            "Fallback Gemini model failed:",
            fallbackError.status || fallbackError.message
        );

        throw fallbackError;
    }
};


// Ask AI Mentor
const askAIMentor = async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        // Validate the message
        if (
            typeof message !== "string" ||
            message.trim() === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid message is required",
            });
        }

        const student = req.student;

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        // Keep only the most recent conversation messages.
        // This prevents the prompt from becoming unnecessarily large.
        const recentHistory = Array.isArray(history)
            ? history.slice(-10)
            : [];

        const conversationHistory = recentHistory
            .map((item) => {
                const role =
                    item.role === "assistant"
                        ? "AI Mentor"
                        : "Student";

                return `${role}: ${item.content}`;
            })
            .join("\n\n");

        const prompt = `
You are the StudentSkillHub AI Mentor.

You are having an ongoing conversation with a student.
Use the student's profile and the previous conversation to
provide relevant, personalized answers.

Student Profile:
Name: ${student.name}
College: ${student.college}
Branch: ${student.branch}
Year: ${student.year}
Skill Level: ${student.skillLevel}
Skills: ${(student.skills || []).join(", ") || "None"}
Completed Modules: ${
            (student.completedModules || []).join(", ") || "None"
        }

Previous Conversation:
${conversationHistory || "No previous conversation."}

Student's New Question:
${message.trim()}

Instructions:
- Answer the student's current question directly.
- Use previous conversation context when relevant.
- Personalize the answer based on the student's skills,
  completed modules, skill level, and learning progress.
- If the student refers to something from the previous
  conversation, understand what they are referring to.
- Be practical, clear, and concise.
- Suggest specific next steps whenever appropriate.
`;

        // Generate response using retry + fallback logic
        const responseText = await generateAIResponse(prompt);

        res.status(200).json({
            success: true,
            message: responseText,
        });
    } catch (error) {
        console.error("AI Mentor error:", error);

        // Friendly error for temporary Gemini availability issues
        if (error.status === 503) {
            return res.status(503).json({
                success: false,
                message:
                    "The AI Mentor is temporarily busy. Please try again in a moment.",
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to get AI Mentor response",
            error: error.message,
        });
    }
};


module.exports = {
    askAIMentor,
};