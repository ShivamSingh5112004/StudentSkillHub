"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { onAuthStateChanged, User } from "firebase/auth";

import {
  getStudentByFirebaseUid,
  addStudentSkill,
  completeModule,
  createStudent,
  askAIMentor,
  askGenkitAgent,
  getAIUsage,
} from "./lib/api";

import { auth } from "./lib/firebase";
import { logoutUser } from "./lib/auth";
import AuthForm from "./components/AuthForm";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [student, setStudent] = useState<any>(null);
  const [newSkill, setNewSkill] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isCompletingModule, setIsCompletingModule] = useState<string | null>(
    null
  );

  // Student Profile states
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCollege, setProfileCollege] = useState("");
  const [profileBranch, setProfileBranch] = useState("");
  const [profileYear, setProfileYear] = useState("");
  const [profileSkillLevel, setProfileSkillLevel] = useState("Beginner");

  // Create Profile loading state
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // StudentSkillHub roadmap
  // Keep this catalog synchronized with the Learning Progress Agent.
  const learningModules = [
    "JavaScript Basics",
    "Intermediate JavaScript",
    "React Fundamentals",
    "Node.js & Express",
    "Database & Firestore",
    "Full-Stack Development",
    "AI & Generative AI",
  ];

  const [showModules, setShowModules] = useState(false);

  // Original AI Mentor states
  const [showAIMentor, setShowAIMentor] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState("");
  const [mentorResponse, setMentorResponse] = useState("");
  const [isAskingMentor, setIsAskingMentor] = useState(false);

  // Original AI Mentor conversation history
  const [aiChat, setAiChat] = useState<
    {
      role: "user" | "assistant";
      content: string;
    }[]
  >([]);

  // Learning Progress Agent states
  const [showLearningAgent, setShowLearningAgent] = useState(false);
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [isAskingAgent, setIsAskingAgent] = useState(false);

  // Daily AI usage states
  const [mentorUsage, setMentorUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  const [agentUsage, setAgentUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  // Learning Progress Agent conversation history
  const [agentChat, setAgentChat] = useState<
    {
      role: "user" | "assistant";
      content: string;
    }[]
  >([]);

  // Learning progress calculation
  const completedCount = student?.completedModules?.length ?? 0;
  const totalModules = learningModules.length;
  const progressPercentage = Math.min(
    Math.round((completedCount / totalModules) * 100),
    100
  );

  // Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch the logged-in student's profile using their Firebase UID
  useEffect(() => {
    if (!user) {
      setStudent(null);
      return;
    }

    getStudentByFirebaseUid(user.uid)
      .then((data) => {
        console.log("Student profile from API:", data);

        if (data && data.student) {
          setStudent(data.student);
        } else {
          setStudent(null);
        }
      })
      .catch((error) => {
        console.error("Student profile API Error:", error);
        setStudent(null);
      });
  }, [user]);

  // Fetch today's AI usage for the authenticated student
  useEffect(() => {
    if (!user) {
      setMentorUsage(null);
      setAgentUsage(null);
      return;
    }

    getAIUsage()
      .then((data) => {
        if (data?.success && data?.usage) {
          setMentorUsage(data.usage.mentor);
          setAgentUsage(data.usage.agent);
        }
      })
      .catch((error) => {
        console.error("AI usage fetch error:", error);
      });
  }, [user]);

  const handleAddSkill = async () => {
    if (!newSkill.trim()) {
      alert("Please enter a skill");
      return;
    }

    if (!student?.id) {
      alert("Student information is not available");
      return;
    }

    try {
      setIsAddingSkill(true);

      const data = await addStudentSkill(
        student.id,
        newSkill.trim()
      );

      setStudent(data.student);
      setNewSkill("");

      alert("Skill added successfully!");
    } catch (error) {
      console.error("Add skill error:", error);
      alert("Failed to add skill");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleCompleteModule = async (module: string) => {
    if (!student?.id) {
      alert("Student information is not available");
      return;
    }

    try {
      setIsCompletingModule(module);

      const data = await completeModule(
        student.id,
        module
      );

      setStudent(data.student);

      alert("Module completed successfully!");
    } catch (error) {
      console.error("Complete module error:", error);
      alert("Failed to complete module");
    } finally {
      setIsCompletingModule(null);
    }
  };

  // Create Student Profile
  const handleCreateProfile = async () => {
    if (
      !profileName.trim() ||
      !profileEmail.trim() ||
      !profileCollege.trim() ||
      !profileBranch.trim() ||
      !profileYear
    ) {
      alert("Please fill in all profile fields");
      return;
    }

    // Get the currently logged-in Firebase user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please log in before creating your student profile");
      return;
    }

    try {
      setIsCreatingProfile(true);

      const data = await createStudent({
        firebaseUid: currentUser.uid,
        name: profileName.trim(),
        email: profileEmail.trim(),
        college: profileCollege.trim(),
        branch: profileBranch.trim(),
        year: profileYear,
        skillLevel: profileSkillLevel,
      });

      // Make the newly created profile the active dashboard student
      setStudent(data.student);

      console.log("Created student:", data);

      alert("Student profile created successfully!");

      setProfileName("");
      setProfileEmail("");
      setProfileCollege("");
      setProfileBranch("");
      setProfileYear("");
      setProfileSkillLevel("Beginner");
    } catch (error) {
      console.error("Create profile error:", error);
      alert("Failed to create student profile");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  // Ask the original AI Mentor
  const handleAskAIMentor = async () => {
    if (!mentorQuestion.trim()) {
      alert("Please enter a question for your AI Mentor");
      return;
    }

    const question = mentorQuestion.trim();

    try {
      setIsAskingMentor(true);
      setMentorResponse("");

      const response = await askAIMentor(question, aiChat);

      const answer =
        response.message ||
        response.answer ||
        response.response ||
        "No response received.";

      if (response?.usage) {
        setMentorUsage(response.usage);
      }

      setAiChat((previousChat) => [
        ...previousChat,
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content: answer,
        },
      ]);

      setMentorQuestion("");
      setMentorResponse(answer);
    } catch (error) {
      console.error("AI Mentor error:", error);

      setMentorResponse(
        "Sorry, I couldn't connect to your AI Mentor right now. Please try again."
      );
    } finally {
      setIsAskingMentor(false);
    }
  };

  // Ask the Learning Progress Agent
  const handleAskLearningAgent = async () => {
    if (!agentQuestion.trim()) {
      alert("Please enter a question for your Learning Progress Agent");
      return;
    }

    const question = agentQuestion.trim();

    try {
      setIsAskingAgent(true);
      setAgentResponse("");

      const response = await askGenkitAgent(question);

      const answer =
        response.message ||
        response.answer ||
        response.response ||
        "No response received.";

      if (response?.usage) {
        setAgentUsage(response.usage);
      }

      setAgentChat((previousChat) => [
        ...previousChat,
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content: answer,
        },
      ]);

      setAgentQuestion("");
      setAgentResponse(answer);
    } catch (error) {
      console.error("Learning Progress Agent error:", error);

      setAgentResponse(
        "Sorry, I couldn't connect to your Learning Progress Agent right now. Please try again."
      );
    } finally {
      setIsAskingAgent(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setStudent(null);
      setShowAIMentor(false);
      setMentorQuestion("");
      setMentorResponse("");
      setAiChat([]);

      setShowLearningAgent(false);
      setAgentQuestion("");
      setAgentResponse("");
      setAgentChat([]);

      setMentorUsage(null);
      setAgentUsage(null);
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout");
    }
  };

  // Authentication loading screen
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  // Show Login / Signup when user is not authenticated
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              StudentSkillHub
            </h1>

            <p className="mt-2 text-gray-500">
              Skill Progression & Mentorship Platform
            </p>
          </div>

          <AuthForm />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              StudentSkillHub
            </h1>

            <p className="text-sm text-gray-500">
              Skill Progression & Mentorship Platform
            </p>
          </div>

          <div className="flex items-center gap-3">

            <span className="hidden text-sm text-gray-500 md:block">
              {user.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>

            <button
              type="button"
              onClick={() => setShowAIMentor(!showAIMentor)}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              AI Mentor
            </button>

            <button
              type="button"
              onClick={() => setShowLearningAgent(!showLearningAgent)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Learning Agent
            </button>

          </div>
        </div>
      </header>

      {/* Dashboard */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {student?.name || "Student"} 👋
          </h2>

          <p className="mt-2 text-gray-600">
            Track your skills, complete learning modules, and improve with
            AI-powered mentorship.
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Skill Level */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Skill Level
            </p>

            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {student?.skillLevel || "Loading..."}
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Keep learning to improve your skill level
            </p>
          </div>

          {/* Skills Tracked */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Skills Tracked
            </p>

            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {student?.skills?.length ?? 0}
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Technical skills in your profile
            </p>
          </div>

          {/* Modules Completed */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Modules Completed
            </p>

            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {student?.completedModules?.length ?? 0}
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Modules completed so far
            </p>
          </div>

        </div>

        {/* Learning Section */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">

          {/* My Skills */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">

            <h3 className="text-xl font-semibold text-gray-900">
              My Skills
            </h3>

            <div className="mt-5 rounded-lg bg-gray-50 p-5">

              {/* Skills State */}
              {student ? (
                student.skills?.length ? (
                  <div className="flex flex-wrap gap-2">

                    {student.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-full border bg-white px-3 py-1 text-sm font-medium text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}

                  </div>
                ) : (
                  <p className="text-gray-600">
                    No skills added yet. Add your first skill below.
                  </p>
                )
              ) : (
                <p className="text-gray-600">
                  Loading skills...
                </p>
              )}

              {/* Add Skill */}
              <div className="mt-4 flex gap-2">

                <input
                  type="text"
                  placeholder="Enter a skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                />

                <button
                  onClick={handleAddSkill}
                  disabled={isAddingSkill}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isAddingSkill ? "Adding..." : "Add Skill"}
                </button>

              </div>

            </div>
          </div>

          {/* Learning Progress */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">

            <h3 className="text-xl font-semibold text-gray-900">
              Learning Progress
            </h3>

            {/* Overall Progress */}
            <div className="mt-4">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-sm font-medium text-gray-700">
                  Overall Progress
                </span>

                <span className="text-sm font-semibold text-gray-900">
                  {progressPercentage}%
                </span>

              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">

                <div
                  className="h-full rounded-full bg-black transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-sm text-gray-500">
                {completedCount} of {totalModules} modules completed
              </p>

            </div>

            <div className="mt-5 rounded-lg bg-gray-50 p-5">

              {/* Completed Modules */}
              {student ? (
                student.completedModules?.length ? (
                  <div className="flex flex-col gap-2">

                    {student.completedModules.map((module: string) => (
                      <div
                        key={module}
                        className="rounded-lg border bg-white px-4 py-2 text-sm text-gray-700"
                      >
                        ✓ {module}
                      </div>
                    ))}

                  </div>
                ) : (
                  <p className="text-gray-600">
                    No modules completed yet. Start learning below.
                  </p>
                )
              ) : (
                <p className="text-gray-600">
                  Loading modules...
                </p>
              )}

              {/* Start Learning */}
              <button
                onClick={() => setShowModules(!showModules)}
                className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                {showModules ? "Hide Modules" : "Start Learning"}
              </button>

              {/* Available Learning Modules */}
              {showModules && (
                <div className="mt-5 flex flex-col gap-3">

                  {learningModules.map((module) => {

                    const isCompleted =
                      student?.completedModules?.includes(module);

                    return (
                      <div
                        key={module}
                        className="flex items-center justify-between rounded-lg border bg-white p-4"
                      >

                        <span className="text-sm font-medium text-gray-700">
                          {module}
                        </span>

                        {isCompleted ? (
                          <span className="text-sm font-medium text-green-600">
                            ✓ Completed
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleCompleteModule(module)
                            }
                            disabled={
                              isCompletingModule === module
                            }
                            className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {isCompletingModule === module
                              ? "Completing..."
                              : "Complete"}
                          </button>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

            </div>
          </div>

        </div>

        {/* Student Profile */}
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">

          {student ? (
            <>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Student Profile
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Your StudentSkillHub profile information.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Full Name
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.name}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Email
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.email}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    College
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.college}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Branch
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.branch}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Year
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.year}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Skill Level
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {student.skillLevel}
                  </p>
                </div>

              </div>

            </>
          ) : (
            <>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create Student Profile
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Enter your details to create your StudentSkillHub profile.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                {/* College */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    College
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your college"
                    value={profileCollege}
                    onChange={(e) => setProfileCollege(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Branch
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={profileBranch}
                    onChange={(e) => setProfileBranch(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Year
                  </label>

                  <select
                    value={profileYear}
                    onChange={(e) => setProfileYear(e.target.value)}
                    className="w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">
                      Select your year
                    </option>

                    <option value="1">
                      1st Year
                    </option>

                    <option value="2">
                      2nd Year
                    </option>

                    <option value="3">
                      3rd Year
                    </option>

                    <option value="4">
                      4th Year
                    </option>

                  </select>
                </div>

                {/* Skill Level */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Skill Level
                  </label>

                  <select
                    value={profileSkillLevel}
                    onChange={(e) => setProfileSkillLevel(e.target.value)}
                    className="w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="Beginner">
                      Beginner
                    </option>

                    <option value="Intermediate">
                      Intermediate
                    </option>

                    <option value="Advanced">
                      Advanced
                    </option>

                  </select>
                </div>

              </div>

              {/* Create Profile Button */}
              <button
                type="button"
                onClick={handleCreateProfile}
                disabled={isCreatingProfile}
                className="mt-6 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isCreatingProfile ? "Creating..." : "Create Profile"}
              </button>

            </>
          )}

        </div>

        {/* Original AI Mentor */}
        <div className="mt-8 rounded-xl bg-black p-8 text-white">
          <h3 className="text-2xl font-bold">
            Meet Your AI Mentor 🤖
          </h3>

          <p className="mt-2 max-w-2xl text-gray-300">
            Get personalized guidance about learning, skills, projects,
            career direction, and general questions.
          </p>

          <div className="mt-4 inline-flex items-center rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300">
            🤖 AI Mentor:{" "}
            <span className="ml-1 font-semibold text-white">
              {mentorUsage?.remaining ?? 10}/{mentorUsage?.limit ?? 10}
            </span>
            <span className="ml-1">queries remaining today</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAIMentor(!showAIMentor)}
            className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black"
          >
            {showAIMentor ? "Close AI Mentor" : "Ask AI Mentor"}
          </button>

          {showAIMentor && (
            <div className="mt-6 rounded-xl bg-white p-5 text-gray-900">
              <div>
                <h4 className="text-lg font-semibold">
                  AI Mentor Chat
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Ask general questions about learning, skills, projects,
                  or your career path.
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Your current learning context
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  Skill Level:{" "}
                  <span className="font-medium text-gray-900">
                    {student?.skillLevel || "Beginner"}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Skills:{" "}
                  <span className="font-medium text-gray-900">
                    {student?.skills?.length
                      ? student.skills.join(", ")
                      : "No skills added yet"}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Learning Progress:{" "}
                  <span className="font-medium text-gray-900">
                    {progressPercentage}%
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Question
                </label>

                <textarea
                  value={mentorQuestion}
                  onChange={(e) => setMentorQuestion(e.target.value)}
                  placeholder="e.g. How can I improve my JavaScript skills?"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <button
                type="button"
                onClick={handleAskAIMentor}
                disabled={
                  isAskingMentor ||
                  mentorUsage?.remaining === 0
                }
                className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAskingMentor
                  ? "AI Mentor is thinking..."
                  : mentorUsage?.remaining === 0
                    ? "Daily Limit Reached"
                    : "Ask AI Mentor"}
              </button>

              {mentorUsage?.remaining === 0 && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  AI Mentor daily limit reached. Please try again tomorrow.
                </p>
              )}

              {aiChat.length > 0 && (
                <div className="mt-5 max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-4">
                    {aiChat.map((chat, index) => (
                      <div
                        key={`mentor-${chat.role}-${index}`}
                        className={
                          chat.role === "user"
                            ? "ml-auto max-w-[85%] rounded-xl bg-black px-4 py-3 text-sm leading-6 text-white"
                            : "mr-auto max-w-[85%] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700"
                        }
                      >
                        <div className="mb-1 text-xs font-semibold opacity-70">
                          {chat.role === "user" ? "You" : "🤖 AI Mentor"}
                        </div>

                        {chat.role === "user" ? (
                          <div className="whitespace-pre-wrap text-white">
                            {chat.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-sm leading-6 text-gray-700">
                            <ReactMarkdown>{chat.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAskingMentor && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🤖</span>
                    <span>AI Mentor is thinking...</span>
                  </div>
                </div>
              )}

              {aiChat.length === 0 &&
                mentorResponse &&
                !isAskingMentor && (
                  <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <h4 className="font-semibold text-gray-900">
                        AI Mentor
                      </h4>
                    </div>

                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {mentorResponse}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Learning Progress Agent */}
        <div className="mt-8 rounded-xl bg-gray-900 p-8 text-white">
          <h3 className="text-2xl font-bold">
            Learning Progress Agent 🎯
          </h3>

          <p className="mt-2 max-w-2xl text-gray-300">
            An action-oriented agent that analyzes your real learning
            progress, checks roadmap prerequisites, recommends your next
            step, and can update your progress when you explicitly ask.
          </p>

          <div className="mt-4 inline-flex items-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300">
            🎯 Learning Agent:{" "}
            <span className="ml-1 font-semibold text-white">
              {agentUsage?.remaining ?? 10}/{agentUsage?.limit ?? 10}
            </span>
            <span className="ml-1">queries remaining today</span>
          </div>

          <button
            type="button"
            onClick={() => setShowLearningAgent(!showLearningAgent)}
            className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black"
          >
            {showLearningAgent
              ? "Close Learning Agent"
              : "Ask Learning Agent"}
          </button>

          {showLearningAgent && (
            <div className="mt-6 rounded-xl bg-white p-5 text-gray-900">
              <div>
                <h4 className="text-lg font-semibold">
                  Learning Progress Agent
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Ask what you should learn next, why a module is suitable,
                  or explicitly request a progress update.
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Agent context
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  Completed Modules:{" "}
                  <span className="font-medium text-gray-900">
                    {student?.completedModules?.length
                      ? student.completedModules.join(", ")
                      : "No modules completed yet"}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Overall Progress:{" "}
                  <span className="font-medium text-gray-900">
                    {progressPercentage}%
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Question
                </label>

                <textarea
                  value={agentQuestion}
                  onChange={(e) => setAgentQuestion(e.target.value)}
                  placeholder="e.g. What should I learn next based on my current progress?"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <button
                type="button"
                onClick={handleAskLearningAgent}
                disabled={
                  isAskingAgent ||
                  agentUsage?.remaining === 0
                }
                className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAskingAgent
                  ? "Learning Agent is thinking..."
                  : agentUsage?.remaining === 0
                    ? "Daily Limit Reached"
                    : "Ask Learning Agent"}
              </button>

              {agentUsage?.remaining === 0 && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  Learning Progress Agent daily limit reached. Please try again tomorrow.
                </p>
              )}

              {agentChat.length > 0 && (
                <div className="mt-5 max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-4">
                    {agentChat.map((chat, index) => (
                      <div
                        key={`agent-${chat.role}-${index}`}
                        className={
                          chat.role === "user"
                            ? "ml-auto max-w-[85%] rounded-xl bg-black px-4 py-3 text-sm leading-6 text-white"
                            : "mr-auto max-w-[85%] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700"
                        }
                      >
                        <div className="mb-1 text-xs font-semibold opacity-70">
                          {chat.role === "user"
                            ? "You"
                            : "🎯 Learning Agent"}
                        </div>

                        {chat.role === "user" ? (
                          <div className="whitespace-pre-wrap text-white">
                            {chat.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-sm leading-6 text-gray-700">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="mb-3 mt-4 text-xl font-bold text-gray-900 first:mt-0">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="mb-2 mt-4 text-lg font-bold text-gray-900 first:mt-0">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="mb-2 mt-4 text-base font-bold text-gray-900 first:mt-0">
                                    {children}
                                  </h3>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-3 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mb-3 ml-5 list-disc space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mb-3 ml-5 list-decimal space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="pl-1">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-bold text-gray-900">
                                    {children}
                                  </strong>
                                ),
                                code: ({ children }) => (
                                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {chat.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAskingAgent && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🎯</span>
                    <span>Learning Agent is thinking...</span>
                  </div>
                </div>
              )}

              {agentChat.length === 0 &&
                agentResponse &&
                !isAskingAgent && (
                  <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <h4 className="font-semibold text-gray-900">
                        Learning Progress Agent
                      </h4>
                    </div>

                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {agentResponse}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

      </section>
    </main>
  );
}