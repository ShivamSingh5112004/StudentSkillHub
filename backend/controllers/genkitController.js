const GENKIT_SERVICE_URL =
    process.env.GENKIT_SERVICE_URL ||
    "http://localhost:8080";


// ============================================================
// CALL GENKIT STUDENT MENTOR FLOW
// ============================================================

const askGenkitMentor = async (req, res) => {
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
        });

    } catch (error) {

        console.error(
            "Genkit Mentor controller error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to connect to the Genkit AI service",
        });
    }
};


module.exports = {
    askGenkitMentor,
};