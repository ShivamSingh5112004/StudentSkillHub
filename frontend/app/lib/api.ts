import { auth } from "./firebase";

// Live Render backend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

// Get Firebase ID token of the currently logged-in user
async function getAuthToken() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User is not authenticated");
  }

  return currentUser.getIdToken();
}

// Get all students
export async function getStudents() {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }

  return response.json();
}

// Get student by Firebase UID
export async function getStudentByFirebaseUid(
  firebaseUid: string
) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/students/firebase/${firebaseUid}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error("Failed to fetch student profile");
  }

  return response.json();
}

// Add a skill to a student
export async function addStudentSkill(
  studentId: string,
  skill: string
) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/students/${studentId}/skills`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        skill,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to add skill");
  }

  return response.json();
}

// Mark a module as completed
export async function completeModule(
  studentId: string,
  module: string
) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/students/${studentId}/modules`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        module,
      }),
  });

  if (!response.ok) {
    throw new Error("Failed to complete module");
  }

  return response.json();
}

// Create a new student profile
export async function createStudent(studentData: {
  firebaseUid: string;
  name: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  skillLevel: string;
}) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/students`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(studentData),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create student");
  }

  return response.json();
}

// Ask the AI Mentor
export async function askAIMentor(
  message: string,
  history: {
    role: "user" | "assistant";
    content: string;
  }[] = []
) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/ai/mentor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        history,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get AI Mentor response");
  }

  return response.json();
}