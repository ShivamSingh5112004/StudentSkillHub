import "dotenv/config";

import express from "express";
import cors from "cors";

import { expressHandler } from "@genkit-ai/express";

import { studentMentorFlow } from "./index.js";


const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);


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
// ERROR HANDLER
// ============================================================

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(
      "Genkit HTTP service error:",
      error
    );

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      success: false,
      message:
        "Genkit AI service encountered an unexpected error.",
    });
  }
);


// ============================================================
// START SERVER
// ============================================================

const PORT = Number(process.env.PORT) || 8080;

const server = app.listen(PORT, () => {
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


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

const shutdown = (signal: string) => {
  console.log(
    `\n${signal} received. Shutting down Genkit AI Service...`
  );

  server.close(() => {
    console.log(
      "StudentSkillHub Genkit AI Service stopped."
    );

    process.exit(0);
  });
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});