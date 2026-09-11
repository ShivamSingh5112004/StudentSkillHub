const { getStudentById } = require("../models/studentModel");

const verifyStudentOwnership = async (req, res, next) => {
    try {
        const studentId =
            req.params.studentId || req.params.id;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required",
            });
        }

        const student = await getStudentById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (student.firebaseUid !== req.user.uid) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to access this student profile",
            });
        }

        req.student = student;

        next();
    } catch (error) {
        console.error(
            "Student ownership verification error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to verify student ownership",
        });
    }
};

module.exports = verifyStudentOwnership;