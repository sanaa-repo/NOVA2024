const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');

const app = express();
const cors = require('cors'); 
app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAI({
    apiKey: "sk-5UdUdZqd1543Q-wnfsRaoA",
    baseURL: "https://nova-litellm-proxy.onrender.com"
});

const functionDefinitions = [
    {
        name: "draw_circle",
        description: "Draws a circle on the canvas",
        parameters: {
            type: "object",
            properties: {
                x: { type: "integer", description: "X-coordinate of the circle center, the width is 500, left-most is 0,right-most is 500" },
                y: { type: "integer", description: "Y-coordinate of the circle center, the height is 500, upper-most is 0, lower-most is 500" },
                size: { type: "integer", description: "Radius of the circle" },
                color: { type: "string", description: "Color of the circle" },
                rotation: { type: "number", description: "Rotation angle in degrees" },
            },
            required: ["x", "y", "size", "color"]
        }
    },
    // Additional shapes here (e.g., draw_rectangle, draw_triangle)
    {
        name: "move_shape",
        description: "Moves or translates the circle to a specified position or direction",
        parameters: {
            type: "object",
            properties: {
                size: { type: "integer", description: "Radius of the circle" },
                color: { type: "string", description: "Color of the circle" },
                rotation: { type: "number", description: "Rotation angle in degrees" },
                positions: {
                    type: "array",
                    description: "A list of random (x, y) positions, of length at least 50, that gradually moves the the desired position.",
                    items: {
                        type: "object",
                        properties: {
                            x: { type: "number", description: "X position, the width is 500, left-most is 0,right-most is 500" },
                            y: { type: "number", description: "Y position, the height is 500, upper-most is 0, lower-most is 500" },
                        },
                        required: ["x", "y"],
                    },
                },
            },
            required: ["positions", "size", "color", "rotation"],
        },
    },
];

app.post('/interpret', async (req, res) => {
    const userPrompt = req.body.prompt;

    // Call GPT API with function definitions
    const response = await openai.chat.completions.create({
        model: "gpt-4o",  // Or another supported model
        messages: [{ role: "user", content: userPrompt }],
        functions: functionDefinitions,
        function_call: "auto", // Automatically call the relevant function
    });

    // Get the function call result
    const functionCall = response.choices[0].message.function_call;
    res.json(functionCall);
});

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
