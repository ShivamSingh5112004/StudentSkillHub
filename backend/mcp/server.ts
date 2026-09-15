import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { db } from "../config/firebase.js";

const server = new McpServer({
  name: "StudentSkillHub MCP Server",
  version: "1.0.0",
});

// ============================================================
// STUDENTSKILLHUB LEARNING ROADMAP
// ============================================================

const roadmap = [
  {
    id: 1,
    title: "JavaScript Basics",
    description:
      "Learn the fundamentals of JavaScript including variables, data types, functions, arrays, objects, and basic programming concepts.",
    prerequisites: [],
  },

  {
    id: 2,
    title: "Intermediate JavaScript",
    description:
      "Build stronger JavaScript skills with advanced functions, asynchronous programming, promises, APIs, and modern JavaScript features.",
    prerequisites: ["JavaScript Basics"],
  },

  {
    id: 3,
    title: "React Fundamentals",
    description:
      "Learn React components, props, state, hooks, event handling, and how to build interactive frontend applications.",
    prerequisites: ["Intermediate JavaScript"],
  },

  {
    id: 4,
    title: "Node.js & Express",
    description:
      "Learn backend development using Node.js and Express, including REST APIs, middleware, routing, and server-side development.",
    prerequisites: ["React Fundamentals"],
  },

  {
    id: 5,
    title: "Database & Firestore",
    description:
      "Learn database concepts and work with Firebase Firestore for storing, querying, and managing application data.",
    prerequisites: ["Node.js & Express"],
  },

  {
    id: 6,
    title: "Full-Stack Development",
    description:
      "Combine frontend and backend skills to build complete full-stack applications and connect them with databases and APIs.",
    prerequisites: [
      "React Fundamentals",
      "Node.js & Express",
      "Database & Firestore",
    ],
  },

  {
    id: 7,
    title: "AI & Generative AI",
    description:
      "Learn the fundamentals of AI-powered application development, LLMs, generative AI, AI agents, and AI integration.",
    prerequisites: ["Full-Stack Development"],
  },
];

// ============================================================
// MCP TOOL 1: GET STUDENT LEARNING STATUS
// ============================================================

server.registerTool(
  "getStudentLearningStatus",
  {
    description:
      "Retrieves the real StudentSkillHub student's learning profile from Firestore using the student's Firebase UID.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .min(1)
        .describe(
          "Firebase UID of the authenticated StudentSkillHub student."
        ),
    }),
  },

  async ({ firebaseUid }) => {
    try {
      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", firebaseUid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "not_found",
                message:
                  "No StudentSkillHub profile was found for the provided Firebase UID.",
              }),
            },
          ],
        };
      }

      const doc = snapshot.docs[0];
      const student = doc.data();

      const result = {
        status: "success",

        student: {
          id: doc.id,

          name: student.name || "Student",

          email: student.email || "Not specified",

          college: student.college || "Not specified",

          branch: student.branch || "Not specified",

          year:
            student.year !== undefined &&
            student.year !== null
              ? String(student.year)
              : "Not specified",

          skillLevel:
            student.skillLevel || "Beginner",

          skills: Array.isArray(student.skills)
            ? student.skills
            : [],

          completedModules: Array.isArray(
            student.completedModules
          )
            ? student.completedModules
            : [],
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      console.error(
        "MCP Firestore student lookup error:",
        error
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message:
                "Failed to retrieve the student profile from Firestore.",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================
// MCP TOOL 2: GET LEARNING ROADMAP
// ============================================================

server.registerTool(
  "getLearningRoadmap",
  {
    description:
      "Retrieves the StudentSkillHub learning roadmap containing the recommended modules, their order, and prerequisites.",

    inputSchema: z.object({}),
  },

  async () => {
    try {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              totalModules: roadmap.length,
              roadmap,
            }),
          },
        ],
      };
    } catch (error) {
      console.error(
        "MCP learning roadmap error:",
        error
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message:
                "Failed to retrieve the StudentSkillHub learning roadmap.",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================
// MCP TOOL 3: GET NEXT RECOMMENDED MODULE
// ============================================================

server.registerTool(
  "getNextRecommendedModule",
  {
    description:
      "Determines the next recommended StudentSkillHub learning module for a student based on their completed modules and prerequisite requirements.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .min(1)
        .describe(
          "Firebase UID of the authenticated StudentSkillHub student."
        ),
    }),
  },

  async ({ firebaseUid }) => {
    try {
      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", firebaseUid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "not_found",
                message:
                  "No StudentSkillHub profile was found for the provided Firebase UID.",
              }),
            },
          ],
        };
      }

      const student = snapshot.docs[0].data();

      const completedModules = Array.isArray(
        student.completedModules
      )
        ? student.completedModules
        : [];

      const completedSet = new Set(
        completedModules.map((module: unknown) =>
          String(module)
        )
      );

      const nextModule = roadmap.find((module) => {
        if (completedSet.has(module.title)) {
          return false;
        }

        return module.prerequisites.every(
          (prerequisite) =>
            completedSet.has(prerequisite)
        );
      });

      if (!nextModule) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "complete",
                message:
                  "The student has completed all available StudentSkillHub roadmap modules.",
                completedModules,
                totalModules: roadmap.length,
              }),
            },
          ],
        };
      }

      const completedCount = completedModules.filter(
        (module: unknown) =>
          roadmap.some(
            (roadmapModule) =>
              roadmapModule.title === String(module)
          )
      ).length;

      const progressPercentage = Math.round(
        (completedCount / roadmap.length) * 100
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",

              recommendation: {
                moduleId: nextModule.id,

                module: nextModule.title,

                description:
                  nextModule.description,

                prerequisites:
                  nextModule.prerequisites,
              },

              progress: {
                completedModules: completedCount,
                totalModules: roadmap.length,
                percentage: progressPercentage,
              },

              completedModules,
            }),
          },
        ],
      };
    } catch (error) {
      console.error(
        "MCP next recommended module error:",
        error
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message:
                "Failed to determine the student's next recommended module.",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================
// MCP TOOL 4: RECORD MODULE COMPLETION
// ============================================================

server.registerTool(
  "recordModuleCompletion",
  {
    description:
      "Records a StudentSkillHub roadmap module as completed for the authenticated student. This should only be used when the student explicitly requests to mark a module as completed.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .min(1)
        .describe(
          "Firebase UID of the authenticated StudentSkillHub student."
        ),

      moduleTitle: z
        .string()
        .min(1)
        .describe(
          "Exact title of the StudentSkillHub roadmap module to mark as completed."
        ),
    }),
  },

  async ({ firebaseUid, moduleTitle }) => {
    try {
      // --------------------------------------------------------
      // Validate that the requested module exists
      // --------------------------------------------------------

      const module = roadmap.find(
        (roadmapModule) =>
          roadmapModule.title === moduleTitle
      );

      if (!module) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "invalid_module",
                message:
                  "The requested module does not exist in the StudentSkillHub learning roadmap.",
                requestedModule: moduleTitle,
                availableModules: roadmap.map(
                  (roadmapModule) =>
                    roadmapModule.title
                ),
              }),
            },
          ],
          isError: true,
        };
      }

      // --------------------------------------------------------
      // Find the student
      // --------------------------------------------------------

      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", firebaseUid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "not_found",
                message:
                  "No StudentSkillHub profile was found for the provided Firebase UID.",
              }),
            },
          ],
          isError: true,
        };
      }

      // --------------------------------------------------------
      // Get existing completed modules
      // --------------------------------------------------------

      const studentDoc = snapshot.docs[0];
      const student = studentDoc.data();

      const completedModules = Array.isArray(
        student.completedModules
      )
        ? student.completedModules
        : [];

      // --------------------------------------------------------
      // Prevent duplicate completion
      // --------------------------------------------------------

      if (
        completedModules.some(
          (completedModule: unknown) =>
            String(completedModule) === module.title
        )
      ) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "already_completed",
                message:
                  "This StudentSkillHub module has already been marked as completed.",
                module: module.title,
                completedModules,
              }),
            },
          ],
        };
      }

      // --------------------------------------------------------
      // Record completion in Firestore
      // --------------------------------------------------------

      const updatedCompletedModules = [
        ...completedModules,
        module.title,
      ];

      await studentDoc.ref.update({
        completedModules: updatedCompletedModules,
      });

      // --------------------------------------------------------
      // Calculate updated progress
      // --------------------------------------------------------

      const completedCount =
        updatedCompletedModules.filter(
          (completedModule: unknown) =>
            roadmap.some(
              (roadmapModule) =>
                roadmapModule.title ===
                String(completedModule)
            )
        ).length;

      const progressPercentage = Math.round(
        (completedCount / roadmap.length) * 100
      );

      // --------------------------------------------------------
      // Return success
      // --------------------------------------------------------

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",

              message:
                "StudentSkillHub module completion recorded successfully.",

              completedModule: module.title,

              progress: {
                completedModules: completedCount,
                totalModules: roadmap.length,
                percentage: progressPercentage,
              },

              completedModules:
                updatedCompletedModules,
            }),
          },
        ],
      };
    } catch (error) {
      console.error(
        "MCP record module completion error:",
        error
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message:
                "Failed to record the StudentSkillHub module completion.",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================
// START MCP SERVER
// ============================================================

const transport = new StdioServerTransport();

async function startServer() {
  await server.connect(transport);
}

startServer().catch((error) => {
  console.error(
    "Failed to start StudentSkillHub MCP Server:",
    error
  );

  process.exit(1);
});