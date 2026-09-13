const GENKIT_SERVICE_URL =
    process.env.GENKIT_SERVICE_URL ||
    "http://localhost:8080";

const {
    consumeAIUsage,
    refundAIUsage,
    getAIUsage,
} = require("../utils/aiUsage");


// ============================================================
// CALL GENKIT STUDENT MENTOR FLOW
// ============================================================

const askGenkitMentor = async (req, res) => {
    let usageReserved = false;

    try {
        const { message } = req.body;

        // ----------------------------------------------------
        // Validate message
        // ----------------------------------------------------

        if (
            typeof message !== "string" ||
            message.trim() === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid message is required",
            });
        }


        // ----------------------------------------------------
        // Get authenticated student's Firebase UID
        // ----------------------------------------------------

        const firebaseUid = req.user?.uid;

        if (!firebaseUid) {
            return res.status(401).json({
                success: false,
                message: "Authenticated student UID not found",
            });
        }


        // ----------------------------------------------------
        // LEARNING PROGRESS AGENT DAILY USAGE LIMIT
        // ----------------------------------------------------

        const usage = await consumeAIUsage(
            firebaseUid,
            "agent"
        );

        if (!usage.allowed) {
            if (usage.reason === "daily_limit_reached") {
                return res.status(429).json({
                    success: false,
                    message:
                        "Your Learning Progress Agent daily limit of 10 queries has been reached. Please try again tomorrow.",
                    usage: {
                        used: usage.used,
                        limit: usage.limit,
                        remaining: usage.remaining,
                    },
                });
            }

            return res.status(401).json({
                success: false,
                message:
                    "Unable to verify Learning Progress Agent usage.",
            });
        }

        // A usage slot has now been reserved.
        usageReserved = true;


        // ----------------------------------------------------
        // Call Genkit service
        // ----------------------------------------------------

        const response = await fetch(
            `${GENKIT_SERVICE_URL}/studentMentorFlow`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    data: {
                        firebaseUid,
                        question: message.trim(),
                    },
                }),
            }
        );


        // ----------------------------------------------------
        // Read Genkit response
        // ----------------------------------------------------

        const responseData = await response.json();


        // ----------------------------------------------------
        // Handle Genkit errors
        // ----------------------------------------------------

        if (!response.ok) {
            console.error(
                "Genkit service error:",
                responseData
            );

            // Genkit did not successfully process the request,
            // so return the reserved usage slot.
            if (usageReserved) {
                try {
                    await refundAIUsage(
                        firebaseUid,
                        "agent"
                    );
                } catch (refundError) {
                    console.error(
                        "Failed to refund Learning Progress Agent usage:",
                        refundError
                    );
                }

                usageReserved = false;
            }

            return res.status(
                response.status >= 400 &&
                response.status < 600
                    ? response.status
                    : 500
            ).json({
                success: false,
                message:
                    responseData.message ||
                    "Genkit AI service failed",
            });
        }


        // ----------------------------------------------------
        // Return AI response to frontend
        // ----------------------------------------------------

        return res.status(200).json({
            success: true,
            message:
                responseData.result ??
                responseData.output ??
                responseData,
            usage: {
                used: usage.used,
                limit: usage.limit,
                remaining: usage.remaining,
            },
        });

    } catch (error) {

        console.error(
            "Genkit Mentor controller error:",
            error
        );

        // If the Genkit request failed after reserving a slot,
        // return the slot to the student.
        if (usageReserved) {
            try {
                const firebaseUid = req.user?.uid;

                if (firebaseUid) {
                    await refundAIUsage(
                        firebaseUid,
                        "agent"
                    );
                }
            } catch (refundError) {
                console.error(
                    "Failed to refund Learning Progress Agent usage:",
                    refundError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message:
                "Failed to connect to the Genkit AI service",
        });
    }
};


// ============================================================
// GET AI USAGE STATUS
// ============================================================

const getAIUsageStatus = async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;

        if (!firebaseUid) {
            return res.status(401).json({
                success: false,
                message: "Authenticated student UID not found",
            });
        }

        const usage = await getAIUsage(firebaseUid);

        return res.status(200).json({
            success: true,
            usage,
        });

    } catch (error) {
        console.error(
            "AI usage status error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get AI usage status",
        });
    }
};


module.exports = {
    askGenkitMentor,
    getAIUsageStatus,
};