import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ==========================================================
// LOAD ENVIRONMENT VARIABLES FROM backend/.env
// ==========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

async function testMcpServer() {
  console.log("Starting StudentSkillHub MCP Client test...");

  const client = new Client({
    name: "StudentSkillHub MCP Test Client",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "server.ts"],
  });

  try {
    // ==========================================================
    // CONNECT TO MCP SERVER
    // ==========================================================

    await client.connect(transport);

    console.log(
      "MCP connection established successfully."
    );
    console.log("");

    // ==========================================================
    // DISCOVER AVAILABLE TOOLS
    // ==========================================================

    const toolsResult = await client.listTools();

    console.log("Available MCP tools:");
    console.log("");

    for (const tool of toolsResult.tools) {
      console.log(`- ${tool.name}`);
    }

    console.log("");

    // ==========================================================
    // TEST TOOL 1: GET LEARNING ROADMAP
    // ==========================================================

    console.log(
      "Testing getLearningRoadmap..."
    );

    const roadmapResult = await client.callTool({
      name: "getLearningRoadmap",
      arguments: {},
    });

    console.log(
      "getLearningRoadmap result:"
    );

    console.log(
      JSON.stringify(
        roadmapResult,
        null,
        2
      )
    );

    console.log("");

    // ==========================================================
    // GET TEST FIREBASE UID
    // ==========================================================

    const testFirebaseUid =
      process.env.ADK_TEST_FIREBASE_UID;

    if (!testFirebaseUid) {
      throw new Error(
        "ADK_TEST_FIREBASE_UID is not configured in backend/.env."
      );
    }

    // ==========================================================
    // TEST TOOL 2: GET STUDENT LEARNING STATUS
    // ==========================================================

    console.log(
      "Testing getStudentLearningStatus..."
    );

    const studentStatusResult =
      await client.callTool({
        name: "getStudentLearningStatus",
        arguments: {
          firebaseUid: testFirebaseUid,
        },
      });

    console.log(
      "getStudentLearningStatus result:"
    );

    console.log(
      JSON.stringify(
        studentStatusResult,
        null,
        2
      )
    );

    console.log("");

    // ==========================================================
    // TEST TOOL 3: GET NEXT RECOMMENDED MODULE
    // ==========================================================

    console.log(
      "Testing getNextRecommendedModule..."
    );

    const nextModuleResult =
      await client.callTool({
        name: "getNextRecommendedModule",
        arguments: {
          firebaseUid: testFirebaseUid,
        },
      });

    console.log(
      "getNextRecommendedModule result:"
    );

    console.log(
      JSON.stringify(
        nextModuleResult,
        null,
        2
      )
    );

    console.log("");

    // ==========================================================
    // TEST COMPLETE
    // ==========================================================

    console.log(
      "Read-only MCP tool tests completed successfully."
    );

    console.log(
      "recordModuleCompletion was intentionally NOT called because it modifies Firestore."
    );

    await client.close();
  } catch (error) {
    console.error(
      "MCP client test failed:"
    );

    console.error(error);

    try {
      await client.close();
    } catch {
      // Ignore cleanup errors.
    }

    process.exit(1);
  }
}

testMcpServer();