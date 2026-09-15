import "dotenv/config";

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { defineMcpClient } from "@genkit-ai/mcp";

import { db } from "../config/firebase.js";

// ============================================================
// LOCAL DEVELOPMENT FALLBACK
// ============================================================

// Used ONLY during local development/testing.
//
// Production will supply the authenticated student's Firebase UID.
const testFirebaseUid = process.env.ADK_TEST_FIREBASE_UID;

// ============================================================
// GENKIT INITIALIZATION
// ============================================================

export const ai = genkit({
  plugins: [googleAI()],
});

// ============================================================
// MCP CLIENT
// ============================================================

// Genkit connects to the StudentSkillHub MCP server through
// the MCP TypeScript SDK stdio transport.
//
// The MCP server exposes the StudentSkillHub learning tools:
//
// - getStudentLearningStatus
// - getLearningRoadmap
// - getNextRecommendedModule
// - recordModuleCompletion
//
// The existing Genkit tools below are intentionally preserved
// so the current implementation remains intact while MCP is
// integrated into the Learning Progress Agent.
//
// The MCP client is attached directly to the single Genkit instance.
// Genkit can therefore resolve the MCP tools by namespace without
// calling getActiveTools(ai) inside every flow request.

const studentSkillHubMcpClient = defineMcpClient(ai, {
  name: "studentSkillHubMcpClient",
  version: "1.0.0",

  mcpServer: {
    command: "npx",
    args: ["tsx", "../mcp/server.ts"],
     env: {
    ...process.env,
    FIREBASE_SERVICE_ACCOUNT:
      process.env.FIREBASE_SERVICE_ACCOUNT ?? "",
  },
  },

  // Cache MCP tool discovery so repeated agent requests do not
  // register the same MCP tools again.
  cacheTtlMillis: 300000,
});

// ============================================================
// TOOL 1: GET STUDENT LEARNING STATUS
// ============================================================

export const getStudentLearningStatus = ai.defineTool(
  {
    name: "getStudentLearningStatus",

    description:
      "Retrieves the real StudentSkillHub student's learning profile from Firestore using the student's Firebase UID.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .optional()
        .describe(
          "Firebase UID of the StudentSkillHub student. During local development, if omitted, the configured development UID is used."
        ),
    }),

    outputSchema: z.object({
      status: z.string(),

      student: z
        .object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          college: z.string(),
          branch: z.string(),
          year: z.string(),
          skillLevel: z.string(),
          skills: z.array(z.string()),
          completedModules: z.array(z.string()),
        })
        .optional(),

      message: z.string().optional(),
    }),
  },

  async ({ firebaseUid }) => {
    try {
      const uid = firebaseUid || testFirebaseUid;

      if (!uid) {
        return {
          status: "error",

          message:
            "No Firebase UID was provided and no development Firebase UID is configured.",
        };
      }

      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          status: "not_found",

          message:
            "No StudentSkillHub profile was found for the provided Firebase UID.",
        };
      }

      const doc = snapshot.docs[0];

      const student = doc.data();

      return {
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
    } catch (error) {
      console.error(
        "Genkit Firestore student lookup error:",
        error
      );

      return {
        status: "error",

        message:
          "Failed to retrieve the student profile from Firestore.",
      };
    }
  }
);

// ============================================================
// TOOL 2: GET STUDENTSKILLHUB LEARNING ROADMAP
// ============================================================

export const getLearningRoadmap = ai.defineTool(
  {
    name: "getLearningRoadmap",

    description:
      "Retrieves the available StudentSkillHub learning roadmap modules and their recommended progression.",

    inputSchema: z.object({}),

    outputSchema: z.object({
      roadmap: z.array(
        z.object({
          module: z.string(),

          level: z.string(),

          description: z.string(),

          prerequisites: z.array(z.string()),
        })
      ),
    }),
  },

  async () => {
    return {
      roadmap: [
        {
          module: "JavaScript Basics",

          level: "Beginner",

          description:
            "Variables, data types, operators, conditions, loops, functions, arrays, and basic JavaScript programming.",

          prerequisites: [],
        },

        {
          module: "Intermediate JavaScript",

          level: "Beginner to Intermediate",

          description:
            "ES6+, destructuring, spread/rest operators, modules, promises, async/await, error handling, and modern JavaScript patterns.",

          prerequisites: ["JavaScript Basics"],
        },

        {
          module: "React Fundamentals",

          level: "Intermediate",

          description:
            "Components, props, state, hooks, event handling, conditional rendering, and reusable UI development.",

          prerequisites: ["Intermediate JavaScript"],
        },

        {
          module: "Node.js & Express",

          level: "Intermediate",

          description:
            "Backend development with Node.js, Express, REST APIs, middleware, routing, and server-side JavaScript.",

          prerequisites: ["Intermediate JavaScript"],
        },

        {
          module: "Database & Firestore",

          level: "Intermediate",

          description:
            "Database concepts, Firebase, Firestore collections, documents, queries, and CRUD operations.",

          prerequisites: ["Node.js & Express"],
        },

        {
          module: "Full-Stack Development",

          level: "Advanced",

          description:
            "Build complete applications by integrating frontend, backend, APIs, authentication, and databases.",

          prerequisites: [
            "React Fundamentals",
            "Node.js & Express",
            "Database & Firestore",
          ],
        },

        {
          module: "AI & Generative AI",

          level: "Advanced",

          description:
            "LLMs, Gemini, prompt engineering, AI application development, Genkit, ADK, and AI-powered features.",

          prerequisites: [
            "Intermediate JavaScript",
            "Node.js & Express",
          ],
        },
      ],
    };
  }
);

// ============================================================
// TOOL 3: GET NEXT RECOMMENDED LEARNING MODULE
// ============================================================

export const getNextRecommendedModule = ai.defineTool(
  {
    name: "getNextRecommendedModule",

    description:
      "Analyzes the authenticated StudentSkillHub student's completed modules against the official learning roadmap and returns the next module whose prerequisites are satisfied.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .optional()
        .describe(
          "Firebase UID of the StudentSkillHub student. During local development, if omitted, the configured development UID is used."
        ),
    }),

    outputSchema: z.object({
      status: z.string(),

      nextModule: z
        .object({
          module: z.string(),
          level: z.string(),
          description: z.string(),
          prerequisites: z.array(z.string()),
        })
        .optional(),

      completedModules: z.array(z.string()),

      message: z.string(),
    }),
  },

  async ({ firebaseUid }) => {
    try {
      const uid = firebaseUid || testFirebaseUid;

      if (!uid) {
        return {
          status: "error",
          completedModules: [],
          message:
            "No Firebase UID was provided and no development Firebase UID is configured.",
        };
      }

      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          status: "not_found",
          completedModules: [],
          message:
            "No StudentSkillHub profile was found for the provided Firebase UID.",
        };
      }

      const student = snapshot.docs[0].data();

      const completedModules = Array.isArray(
        student.completedModules
      )
        ? student.completedModules
        : [];

      const roadmap = [
        {
          module: "JavaScript Basics",
          level: "Beginner",
          description:
            "Variables, data types, operators, conditions, loops, functions, arrays, and basic JavaScript programming.",
          prerequisites: [],
        },

        {
          module: "Intermediate JavaScript",
          level: "Beginner to Intermediate",
          description:
            "ES6+, destructuring, spread/rest operators, modules, promises, async/await, error handling, and modern JavaScript patterns.",
          prerequisites: ["JavaScript Basics"],
        },

        {
          module: "React Fundamentals",
          level: "Intermediate",
          description:
            "Components, props, state, hooks, event handling, conditional rendering, and reusable UI development.",
          prerequisites: ["Intermediate JavaScript"],
        },

        {
          module: "Node.js & Express",
          level: "Intermediate",
          description:
            "Backend development with Node.js, Express, REST APIs, middleware, routing, and server-side JavaScript.",
          prerequisites: ["Intermediate JavaScript"],
        },

        {
          module: "Database & Firestore",
          level: "Intermediate",
          description:
            "Database concepts, Firebase, Firestore collections, documents, queries, and CRUD operations.",
          prerequisites: ["Node.js & Express"],
        },

        {
          module: "Full-Stack Development",
          level: "Advanced",
          description:
            "Build complete applications by integrating frontend, backend, APIs, authentication, and databases.",
          prerequisites: [
            "React Fundamentals",
            "Node.js & Express",
            "Database & Firestore",
          ],
        },

        {
          module: "AI & Generative AI",
          level: "Advanced",
          description:
            "LLMs, Gemini, prompt engineering, AI application development, Genkit, ADK, and AI-powered features.",
          prerequisites: [
            "Intermediate JavaScript",
            "Node.js & Express",
          ],
        },
      ];

      const nextModule = roadmap.find(
        (item) =>
          !completedModules.includes(item.module) &&
          item.prerequisites.every((prerequisite) =>
            completedModules.includes(prerequisite)
          )
      );

      if (!nextModule) {
        return {
          status: "complete",
          completedModules,
          message:
            "No additional roadmap module is currently available. The student has either completed the roadmap or still has a prerequisite dependency to satisfy.",
        };
      }

      return {
        status: "success",
        nextModule,
        completedModules,
        message:
          `The next recommended module is "${nextModule.module}" because all of its prerequisites are satisfied.`,
      };
    } catch (error) {
      console.error(
        "Genkit next learning module error:",
        error
      );

      return {
        status: "error",
        completedModules: [],
        message:
          "Failed to determine the student's next recommended learning module.",
      };
    }
  }
);

// ============================================================
// TOOL 4: RECORD MODULE COMPLETION
// ============================================================

export const recordModuleCompletion = ai.defineTool(
  {
    name: "recordModuleCompletion",

    description:
      "Records a completed learning module for the StudentSkillHub student identified by the provided Firebase UID. Use this tool only when the student explicitly asks to mark or record a module as completed.",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .optional()
        .describe(
          "Firebase UID of the student whose progress should be updated."
        ),

      moduleName: z
        .string()
        .describe(
          "The exact name of the learning module completed by the student."
        ),
    }),

    outputSchema: z.object({
      status: z.string(),

      moduleName: z.string(),

      message: z.string(),
    }),
  },

  async ({ firebaseUid, moduleName }) => {
    try {
      const uid = firebaseUid || testFirebaseUid;

      if (!uid) {
        return {
          status: "error",

          moduleName,

          message:
            "No Firebase UID was provided and no development Firebase UID is configured.",
        };
      }

      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          status: "not_found",

          moduleName,

          message:
            "No StudentSkillHub profile was found for the provided Firebase UID.",
        };
      }

      const studentDoc = snapshot.docs[0];

      const student = studentDoc.data();

      const completedModules = Array.isArray(
        student.completedModules
      )
        ? student.completedModules
        : [];

      // Prevent duplicate completion entries.
      if (completedModules.includes(moduleName)) {
        return {
          status: "already_completed",

          moduleName,

          message:
            `The module "${moduleName}" is already recorded as completed.`,
        };
      }

      await db
        .collection("students")
        .doc(studentDoc.id)
        .update({
          completedModules: [
            ...completedModules,
            moduleName,
          ],
        });

      return {
        status: "success",

        moduleName,

        message:
          `The module "${moduleName}" has been successfully recorded as completed.`,
      };
    } catch (error) {
      console.error(
        "Genkit module completion error:",
        error
      );

      return {
        status: "error",

        moduleName,

        message:
          "Failed to record the completed module in Firestore.",
      };
    }
  }
);

// ============================================================
// STUDENT MENTOR FLOW
// ============================================================

export const studentMentorFlow = ai.defineFlow(
  {
    name: "studentMentorFlow",

    inputSchema: z.object({
      firebaseUid: z
        .string()
        .optional()
        .describe(
          "Firebase UID of the authenticated StudentSkillHub student."
        ),

      question: z
        .string()
        .min(1)
        .describe(
          "The student's learning-related question."
        ),
    }),

    outputSchema: z.string(),
  },

  async ({ firebaseUid, question }) => {
    // Use authenticated UID when supplied.
    //
    // Local development can fall back to ADK_TEST_FIREBASE_UID.
    const uid = firebaseUid || testFirebaseUid;

    if (!uid) {
      throw new Error(
        "No Firebase UID was provided for the StudentSkillHub Genkit flow."
      );
    }

    // ==========================================================
    // GENERATE LEARNING PROGRESS RESPONSE
    // ==========================================================

    // The MCP client is defined once at Genkit startup.
    // Genkit resolves the MCP tools through the client namespace
    // instead of registering them again for every request.
    const response = await ai.generate({
      model: googleAI.model("gemini-3.6-flash"),

      // Expose all StudentSkillHub MCP tools through the
      // defineMcpClient dynamic tool provider.
      tools: ["studentSkillHubMcpClient:tool/*"],

      // Keep this as a single ai.generate() call.
      // No retry/fallback middleware is used here because repeated
      // model generations can cause MCP registration conflicts.
      prompt: `
You are the StudentSkillHub Learning Progress Agent.

Your primary responsibility is to analyze the authenticated
student's real learning progress, determine the next logical
learning step from the StudentSkillHub roadmap, and update
Firestore only when the student explicitly requests an action.

You are not a generic chatbot. Your recommendations must be
grounded in the student's actual Firestore progress and the
StudentSkillHub roadmap.

============================================================
CURRENT STUDENT IDENTITY
============================================================

The authenticated student's Firebase UID is:

${uid}

IMPORTANT:

Always use this exact Firebase UID when calling the StudentSkillHub
MCP tools that require a Firebase UID.

Never replace it with another UID.

Never guess or invent a Firebase UID.

Never use another student's information.

============================================================
AVAILABLE MCP TOOLS
============================================================

The StudentSkillHub MCP server provides these tools:

1. getStudentLearningStatus

Retrieves the student's real profile from Firestore.

2. getLearningRoadmap

Retrieves the available StudentSkillHub learning modules
and their recommended progression.

3. getNextRecommendedModule

Analyzes the student's completed modules and returns the next
roadmap module whose prerequisites are satisfied.

4. recordModuleCompletion

Records a completed learning module in Firestore.

============================================================
MCP TOOL USAGE
============================================================

When the student asks about:

- their skills
- their learning progress
- completed modules
- their current level
- what they should learn next
- their learning journey
- which module they should study now

do the following:

1. Use getStudentLearningStatus first.

2. Use getLearningRoadmap when roadmap details are needed.

3. Use getNextRecommendedModule when the student asks for
   the next module, next step, or a progress-based recommendation.

4. Treat the tool result as the authoritative calculation of
   prerequisite eligibility.

5. Do not invent a different next module when the tool identifies
   an eligible one.

6. Explain which completed modules support the recommendation.

7. Mention any important prerequisite dependency when useful.

8. Give practical next actions for the recommended module.

9. If the student has no profile, do not invent progress.
   Explain that the profile is required.

============================================================
MODULE COMPLETION REQUESTS
============================================================

If the student explicitly asks to mark or record a module
as completed:

1. Use getStudentLearningStatus first.

2. Check whether the module is already completed.

3. If it is already completed, do NOT call
   recordModuleCompletion.

4. If it is not completed, call
   recordModuleCompletion using the current student's UID.

5. Do not mark a module completed simply because you
   recommended it.

6. Do not mark a module completed because the student says
   they intend to learn it.

7. Only perform the completion action when the student
   explicitly requests it.

8. After a successful update, tell the student that their
   progress has been updated.

============================================================
MULTI-STUDENT DATA SAFETY
============================================================

StudentSkillHub supports multiple students.

Each student's Firebase UID identifies their own profile.

Never mix data between students.

Never use:

- another student's name
- another student's email
- another student's skills
- another student's completed modules
- another student's learning level

when responding to the current student.

Only use data retrieved for the current Firebase UID.

============================================================
PROFILE NOT FOUND
============================================================

If getStudentLearningStatus reports that the profile
cannot be found:

- Do not invent a profile.
- Do not use another student's profile.
- Explain that the StudentSkillHub profile could not be found.
- Suggest completing the student's profile setup if appropriate.

============================================================
RESPONSE STYLE
============================================================

Keep responses:

- practical
- clear
- personalized
- student-friendly

Give actionable learning guidance.

Always base personalized recommendations on the student's
actual Firestore profile.

============================================================
STUDENT QUESTION
============================================================

${question}

Provide the final answer after using the appropriate
StudentSkillHub MCP tools.
`,
    });

    return response.text;
  }
);