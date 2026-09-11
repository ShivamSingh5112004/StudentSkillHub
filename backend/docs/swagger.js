const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "StudentSkillHub API",
      version: "1.0.0",
      description:
        "REST API for the StudentSkillHub Skill Progression & Mentorship Platform",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
  },

  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;