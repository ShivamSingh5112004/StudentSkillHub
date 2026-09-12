require("dotenv").config();

const ai = require("./ai/gemini");

async function testGemini() {
    try {
        const response = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: "Say hello from StudentSkillHub AI Mentor.",
        });

        console.log("Gemini response:");
        console.log(response.output_text);
    } catch (error) {
        console.error("Gemini API test failed:");
        console.error(error.message);
    }
}

testGemini();