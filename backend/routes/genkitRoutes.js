const express = require("express");

const verifyFirebaseToken = require("../middleware/authMiddleware");

const {
    askGenkitMentor,
    getAIUsageStatus,
} = require("../controllers/genkitController");

const router = express.Router();


// ============================================================
// LEARNING PROGRESS AGENT
// ============================================================

router.post(
    "/agent",
    verifyFirebaseToken,
    askGenkitMentor
);


// ============================================================
// AI USAGE STATUS
// ============================================================

router.get(
    "/usage",
    verifyFirebaseToken,
    getAIUsageStatus
);


module.exports = router;