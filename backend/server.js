const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const studentRoutes = require("./routes/studentRoutes");
const swaggerSpec = require("./docs/swagger");

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// CORS
app.use(
    cors({
        origin: true,
    })
);

// Parse JSON requests
app.use(express.json());

// Swagger API documentation
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Student APIs
app.use("/api/students", studentRoutes);

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Student Skill Hub API is healthy 🚀",
    });
});

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Student Skill Hub API is running 🚀",
    });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(
        `Student Skill Hub server running on http://${HOST}:${PORT}`
    );
});