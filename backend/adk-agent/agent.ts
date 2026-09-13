import "dotenv/config";

import { FunctionTool, LlmAgent } from "@google/adk";

import { z } from "zod";

import { db } from "../config/firebase.js";


// ============================================================
// LOCAL DEVELOPMENT FALLBACK
// ============================================================

// This UID is used ONLY when testing locally.
//
// In the final production architecture, the authenticated
// student's Firebase UID will be supplied by the application.
const testFirebaseUid = process.env.ADK_TEST_FIREBASE_UID;


// ============================================================
// TOOL 1: GET STUDENT LEARNING STATUS
// ============================================================

const getStudentLearningStatus = new FunctionTool({
  name: "get_student_learning_status",

  description:
    "Retrieves the real StudentSkillHub student's learning profile from Firestore using the student's Firebase UID.",

  parameters: z.object({
    firebaseUid: z
      .string()
      .optional()
      .describe(
        "Firebase UID of the StudentSkillHub student. During local development, if omitted, the configured development UID is used."
      ),
  }),

  execute: async ({ firebaseUid }) => {
    try {
      // ========================================================
      // STUDENT IDENTITY
      // ========================================================
      //
      // Production:
      //     firebaseUid comes from the authenticated student.
      //
      // Local development:
      //     ADK_TEST_FIREBASE_UID is used as a fallback.
      //
      // This allows the same tool to work for every student
      // without hardcoding a particular student into the tool.
      const uid = firebaseUid || testFirebaseUid;

      if (!uid) {
        return {
          status: "error",

          message:
            "No Firebase UID was provided and no development Firebase UID is configured.",
        };
      }


      // ========================================================
      // FIND STUDENT PROFILE
      // ========================================================

      const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", uid)
        .limit(1)
        .get();


      // ========================================================
      // STUDENT NOT FOUND
      // ========================================================

      if (snapshot.empty) {
        return {
          status: "not_found",

          message:
            "No StudentSkillHub profile was found for the provided Firebase UID.",
        };
      }


      // ========================================================
      // READ STUDENT PROFILE
      // ========================================================

      const doc = snapshot.docs[0];

      const student = doc.data();


      // ========================================================
      // RETURN STUDENT-SPECIFIC DATA
      // ========================================================

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
        "ADK Firestore student lookup error:",
        error
      );


      return {
        status: "error",

        message:
          "Failed to retrieve the student profile from Firestore.",
      };
    }
  },
});


// ============================================================
// ADK ROOT AGENT
// ============================================================

export const rootAgent = new LlmAgent({

  name: "student_learning_advisor",

  model: "gemini-flash-latest",

  description:
    "An AI learning advisor that retrieves the authenticated StudentSkillHub student's real learning profile and provides personalized learning recommendations.",

  instruction: `

You are the StudentSkillHub Student Learning Advisor.

Your job is to help students understand their learning
progress and decide what they should learn next.

============================================================
STUDENT IDENTITY
============================================================

StudentSkillHub is a multi-student application.

Every student has their own Firebase Authentication
identity and their own Firestore student profile.

The Firebase UID identifies the student whose information
you are allowed to access.

When a Firebase UID is provided by the application:

- Use that exact UID when calling
  get_student_learning_status.

- Never replace it with another UID.

- Never guess a Firebase UID.

- Never invent a Firebase UID.

- Never use information belonging to another student.

During local development, if no Firebase UID is supplied
to the tool, the tool may use the configured development
student from the local environment.

The development student exists ONLY for testing.

Do not assume that the development student represents
every StudentSkillHub user.

============================================================
STUDENT PROFILE
============================================================

When the student asks about:

- their skills
- their learning progress
- completed modules
- their current level
- what they should learn next
- their learning journey

use the get_student_learning_status tool first.

After receiving the profile:

1. Review the student's current skill level.

2. Review their existing skills.

3. Review their completed modules.

4. Identify their current learning position.

5. Recommend the next logical learning step.

6. Explain why that step is appropriate.

7. Give practical next actions.

============================================================
MULTI-STUDENT DATA ISOLATION
============================================================

StudentSkillHub contains profiles for multiple students.

Treat each Firebase UID as a completely separate student
identity.

Never mix information between students.

Never use one student's:

- name
- email
- college
- branch
- year
- skill level
- skills
- completed modules

when responding to another student.

Only use information returned by the Firestore tool for
the currently requested student.

Never invent student information.

Never assume that two students have the same learning
progress.

Never claim that a student has a skill or completed a
module unless the retrieved Firestore profile shows it.

============================================================
STUDENT PROFILE NOT FOUND
============================================================

If get_student_learning_status reports that no profile
was found:

- Do not invent a profile.
- Do not use another student's profile.
- Clearly explain that the StudentSkillHub profile could
  not be found.
- Suggest that the student complete their StudentSkillHub
  profile setup if appropriate.

============================================================
RESPONSE STYLE
============================================================

Keep responses:

- practical
- clear
- personalized
- student-friendly

Focus on actionable learning guidance.

Always base personalized recommendations on the student's
actual Firestore profile.

`,

  tools: [
    getStudentLearningStatus,
  ],
});