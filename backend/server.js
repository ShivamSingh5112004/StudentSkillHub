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

app.use(
    cors({
        origin: true,
    })
);


// ============================================================
// PARSE JSON REQUESTS
// ============================================================

app.use(express.json());


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

app.use("/api/students", studentRoutes);


// ============================================================
// EXISTING AI MENTOR APIs
// ============================================================

app.use("/api/ai", aiRoutes);


// ============================================================
// GENKIT AI AGENT APIs
// ============================================================

app.use("/api/ai", genkitRoutes);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Student Skill Hub API is healthy 🚀",
    });
});


// ============================================================
// ROOT ROUTE
// ============================================================

app.get("/", (req, res) => {
    res.json({
        message: "Student Skill Hub API is running 🚀",
    });
});


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, HOST, () => {
    console.log(
        `Student Skill Hub server running on http://${HOST}:${PORT}`
    );
});