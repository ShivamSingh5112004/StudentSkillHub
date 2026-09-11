const {
    createStudent: createStudentModel,
    getAllStudents,
    getStudentById: getStudentByIdModel,
    getStudentByFirebaseUid: getStudentByFirebaseUidModel,
    addSkill,
    addCompletedModule,
} = require("../models/studentModel");

// Create a new student
const createStudent = async (req, res) => {
    try {
        // Use the UID verified by Firebase Authentication.
        // Do not trust a Firebase UID sent from the frontend.
        const firebaseUid = req.user.uid;

        const studentData = {
            firebaseUid,
            name: req.body.name,
            email: req.body.email,
            college: req.body.college,
            branch: req.body.branch,
            year: req.body.year,
            skillLevel: req.body.skillLevel || "Beginner",
            skills: req.body.skills || [],
            completedModules: req.body.completedModules || [],
            createdAt: new Date(),
        };

        if (!firebaseUid) {
            return res.status(401).json({
                success: false,
                message: "Authenticated Firebase user is required",
            });
        }

        const student = await createStudentModel(studentData);

        res.status(201).json({
            success: true,
            message: "Student created successfully",
            studentId: student.id,
            student,
        });
    } catch (error) {
        console.error("Create student error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create student",
            error: error.message,
        });
    }
};

// Get all students
const getStudents = async (req, res) => {
    try {
        const students = await getAllStudents();

        res.status(200).json({
            success: true,
            count: students.length,
            students,
        });
    } catch (error) {
        console.error("Get students error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch students",
            error: error.message,
        });
    }
};

// Get one student by ID
const getStudentById = async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const student = await getStudentByIdModel(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        res.status(200).json({
            success: true,
            student,
        });
    } catch (error) {
        console.error("Get student error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch student",
            error: error.message,
        });
    }
};

// Get student by Firebase UID
const getStudentByFirebaseUid = async (req, res) => {
    try {
        const requestedUid = req.params.firebaseUid;
        const authenticatedUid = req.user.uid;

        // A user can only request their own Firebase UID.
        if (requestedUid !== authenticatedUid) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to access this student profile",
            });
        }

        console.log(
            "Looking up student with Firebase UID:",
            authenticatedUid
        );

        const student =
            await getStudentByFirebaseUidModel(authenticatedUid);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        res.status(200).json({
            success: true,
            student,
        });
    } catch (error) {
        console.error(
            "Get student by Firebase UID error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch student profile",
            error: error.message,
        });
    }
};

// Add a skill to a student
const addStudentSkill = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { skill } = req.body;

        if (!skill || skill.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Skill is required",
            });
        }

        const student = await addSkill(
            studentId,
            skill.trim()
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Skill added successfully",
            student,
        });
    } catch (error) {
        console.error("Add skill error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add skill",
            error: error.message,
        });
    }
};

// Mark a module as completed
const completeModule = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { module } = req.body;

        if (!module) {
            return res.status(400).json({
                success: false,
                message: "Module name is required",
            });
        }

        const student = await addCompletedModule(
            studentId,
            module
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Module marked as completed successfully",
            student,
        });
    } catch (error) {
        console.error("Complete module error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to mark module as completed",
            error: error.message,
        });
    }
};

module.exports = {
    createStudent,
    getStudents,
    getStudentById,
    getStudentByFirebaseUid,
    addStudentSkill,
    completeModule,
};