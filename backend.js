const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static('public'));

// Route to serve draw.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/draw.html');
});

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
                x: { type: "integer", description: "X-coordinate of the circle center" },
                y: { type: "integer", description: "Y-coordinate of the circle center" },
                size: { type: "integer", description: "Radius of the circle" },
                color: { type: "string", description: "Color of the circle" },
                rotation: { type: "number", description: "Rotation angle in degrees" },
            },
            required: ["x", "y", "size", "color"]
        }
    },
    // Additional shapes here (e.g., draw_rectangle, draw_triangle)
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
