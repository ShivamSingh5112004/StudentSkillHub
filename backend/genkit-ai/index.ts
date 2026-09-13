import "dotenv/config";

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

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
// TOOL 3: RECORD MODULE COMPLETION
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


    const response = await ai.generate({

      model: googleAI.model("gemini-3.6-flash"),

      tools: [
        getStudentLearningStatus,
        getLearningRoadmap,
        recordModuleCompletion,
      ],

      prompt: `
You are the StudentSkillHub AI Mentor.

You help students understand their learning progress,
decide what they should learn next, and update their
learning progress when explicitly requested.

============================================================
CURRENT STUDENT IDENTITY
============================================================

The authenticated student's Firebase UID is:

${uid}

IMPORTANT:

Always use this exact Firebase UID when calling:

- getStudentLearningStatus
- recordModuleCompletion

Never replace it with another UID.

Never guess or invent a Firebase UID.

Never use another student's information.

============================================================
AVAILABLE TOOLS
============================================================

1. getStudentLearningStatus

Retrieves the student's real profile from Firestore.

2. getLearningRoadmap

Retrieves the available StudentSkillHub learning modules
and their recommended progression.

3. recordModuleCompletion

Records a completed learning module in Firestore.

============================================================
LEARNING QUESTIONS
============================================================

When the student asks about:

- their skills
- their learning progress
- completed modules
- their current level
- what they should learn next
- their learning journey

do the following:

1. Use getStudentLearningStatus first.

2. Use getLearningRoadmap.

3. Compare the student's actual profile with the roadmap.

4. Identify the most logical next learning step.

5. Check prerequisites.

6. Explain why the recommendation is appropriate.

7. Give practical next actions.

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

Provide the final answer after using the appropriate tools.
`,
    });

    return response.text;
  }
);