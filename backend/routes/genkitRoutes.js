const express = require("express");

const verifyFirebaseToken = require("../middleware/authMiddleware");
const {
    askGenkitMentor,
} = require("../controllers/genkitController");


const router = express.Router();


// ============================================================
// GENKIT AI AGENT
// ============================================================

router.post(
    "/agent",
    verifyFirebaseToken,
    askGenkitMentor
);


module.exports = router;