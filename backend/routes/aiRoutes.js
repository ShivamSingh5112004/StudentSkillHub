const express = require("express");

const { askAIMentor } = require("../controllers/aiController");

const verifyFirebaseToken = require("../middleware/authMiddleware");
const loadStudentContext = require("../middleware/studentContextMiddleware");

const router = express.Router();

// Ask the AI Mentor
// Only authenticated students with a profile can use the AI Mentor

router.post(
    "/mentor",
    verifyFirebaseToken,
    loadStudentContext,
    askAIMentor
);

module.exports = router;