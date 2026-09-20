require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const studentRoutes = require("./routes/studentRoutes");
const aiRoutes = require("./routes/aiRoutes");
const genkitRoutes = require("./routes/genkitRoutes");
const swaggerSpec = require("./docs/swagger");


const app = express();

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";


// ============================================================
// CORS
// ============================================================

const corsOrigin =
    process.env.CORS_ORIGIN ||
    "http://localhost:3000";

app.use(
    cors({
        origin: corsOrigin,
    })
);


// ============================================================
// PARSE JSON REQUESTS
// ============================================================

app.use(
    express.json({
        limit: "1mb",
    })
);


// ============================================================
// SWAGGER API DOCUMENTATION
// ============================================================

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);


// ============================================================
// STUDENT APIs
// ============================================================

app.use(
    "/api/students",
    studentRoutes
);


// ============================================================
// EXISTING AI MENTOR APIs
// ============================================================

app.use(
    "/api/ai",
    aiRoutes
);


// ============================================================
// GENKIT AI AGENT APIs
// ============================================================

app.use(
    "/api/ai",
    genkitRoutes
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message:
            "Student Skill Hub API is healthy 🚀",
    });
});


// ============================================================
// ROOT ROUTE
// ============================================================

app.get("/", (_req, res) => {
    res.json({
        message:
            "Student Skill Hub API is running 🚀",
    });
});


// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (error, _req, res, _next) => {
        console.error(
            "Backend server error:",
            error?.message ||
                "Unknown server error"
        );

        if (res.headersSent) {
            return;
        }

        res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, HOST, () => {
    console.log(
        `Student Skill Hub server running on http://${HOST}:${PORT}`
    );
});