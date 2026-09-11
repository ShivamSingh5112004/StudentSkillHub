const express = require("express");

const {
    createStudent,
    getStudents,
    getStudentById,
    getStudentByFirebaseUid,
    addStudentSkill,
    completeModule,
} = require("../controllers/studentController");

const validateStudent = require("../middleware/studentValidation");
const verifyFirebaseToken = require("../middleware/authMiddleware");
const verifyStudentOwnership = require("../middleware/studentOwnershipMiddleware");

const router = express.Router();

// Protect all student API routes with Firebase Authentication
router.use(verifyFirebaseToken);

// Create a student
router.post("/", validateStudent, createStudent);

// Get all students
router.get("/", getStudents);

// Get student by Firebase UID
router.get(
    "/firebase/:firebaseUid",
    getStudentByFirebaseUid
);

// Get a student by ID
// Only the owner of the profile can access it
router.get(
    "/:studentId",
    verifyStudentOwnership,
    getStudentById
);

// Add a skill to a student
// Only the owner can modify the profile
router.post(
    "/:studentId/skills",
    verifyStudentOwnership,
    addStudentSkill
);

// Mark a module as completed
// Only the owner can modify the profile
router.post(
    "/:id/modules",
    verifyStudentOwnership,
    completeModule
);

module.exports = router;