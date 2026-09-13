import "dotenv/config";

import express from "express";
import cors from "cors";

import { expressHandler } from "@genkit-ai/express";

import { studentMentorFlow } from "./index.js";


const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "StudentSkillHub Genkit AI Service",
    status: "running",
  });
});


// ============================================================
// GENKIT STUDENT MENTOR FLOW
// ============================================================

app.post(
  "/studentMentorFlow",
  expressHandler(studentMentorFlow)
);


// ============================================================
// START SERVER
// ============================================================

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(
    `StudentSkillHub Genkit AI Service running on port ${PORT}`
  );

  console.log(
    `Health check: http://localhost:${PORT}/health`
  );

  console.log(
    `Student Mentor Flow: http://localhost:${PORT}/studentMentorFlow`
  );
});