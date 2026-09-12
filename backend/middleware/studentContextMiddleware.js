const { getStudentByFirebaseUid } = require("../models/studentModel");

// Load the student profile belonging to the authenticated Firebase user
const loadStudentContext = async (req, res, next) => {
    try {
        const firebaseUid = req.user.uid;

        const student = await getStudentByFirebaseUid(firebaseUid);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        // Make the student profile available to controllers
        req.student = student;

        next();
    } catch (error) {
        console.error(
            "Student context loading error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load student profile",
        });
    }
};

module.exports = loadStudentContext;