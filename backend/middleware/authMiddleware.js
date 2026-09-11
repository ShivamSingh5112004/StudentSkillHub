const { getAuth } = require("firebase-admin/auth");

const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken = await getAuth().verifyIdToken(idToken);

        req.user = decodedToken;

        next();
    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};

module.exports = verifyFirebaseToken;