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
                x: { type: "integer", description: "X-coordinate of the circle center, the width is 500, left-most is 0,right-most is 500" },
                y: { type: "integer", description: "Y-coordinate of the circle center, the height is 500, upper-most is 0, lower-most is 500" },
                size: { type: "integer", description: "Radius of the circle" },
                color: { type: "string", description: "Color of the circle" },
                rotation: { type: "number", description: "Rotation angle in degrees" },
            },
            required: ["x", "y", "size", "color"]
        }
    },
    {
        name: "draw_triangle",
        description: "Draws a triangle on the canvas",
        parameters: {
            type: "object",
            properties: {
                x: { type: "integer", description: "X-coordinate of the triangle's center" },
                y: { type: "integer", description: "Y-coordinate of the triangle's center" },
                size: { type: "integer", description: "Size of the triangle (distance from center to each vertex)" },
                color: { type: "string", description: "Color of the triangle" },
                rotation: { type: "number", description: "Rotation angle in degrees" },
            },
            required: ["x", "y", "size", "color"]
        }
    },
    {
        name: "draw_rectangle",
        description: "Draws a rectangle on the canvas",
        parameters: {
            type: "object",
            properties: {
                x: { type: "integer", description: "X-coordinate of the rectangle center" },
                y: { type: "integer", description: "Y-coordinate of the rectangle center" },
                width: { type: "integer", description: "Width of the rectangle" },
                height: { type: "integer", description: "Height of the rectangle" },
                color: { type: "string", description: "Color of the rectangle" },
                rotation: { type: "number", description: "Rotation angle in degrees" }
            },
            required: ["x", "y", "width", "height", "color"]
        }
    },
    {
        name: "draw_line",
        description: "Draws a line on the canvas",
        parameters: {
            type: "object",
            properties: {
                x1: { type: "integer", description: "X-coordinate of the start point" },
                y1: { type: "integer", description: "Y-coordinate of the start point" },
                x2: { type: "integer", description: "X-coordinate of the end point" },
                y2: { type: "integer", description: "Y-coordinate of the end point" },
                color: { type: "string", description: "Color of the line" },
                width: { type: "integer", description: "Width of the line" },
            },
            required: ["x1", "y1", "x2", "y2", "color"]
        }
    },
    {
        name: "redraw_shape",
        description: "Redraws an already existing shape in a certain direction",
        parameters: {
            type: "object",
            properties: {
                shape_id: { type: "integer", description: "ID of the shape to move" },
                direction: { type: "string", description: "Direction to move (up, down, left, right)" },
                distance: { type: "integer", description: "Distance to move the shape (in pixels)" }
            },
            required: ["shape_id", "direction", "distance"]
        }
    },
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

// In-memory storage of shapes (id, coordinates, type, etc.)
let shapes = [];
let shapeCounter = 0;

async function getMovementDistanceFromPrompt(prompt) {
    // Ask the model to estimate the distance based on the user's natural language
    const response = await openai.chat.completions.create({
        model: "gpt-4o", // Or another supported model
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that understands spatial movement."
            },
            {
                role: "user",
                content: `Based on the following prompt, estimate the movement distance in pixels (in a range like 10, 20, or 50 px): "${prompt}"`
            }
        ]
    });

    const estimatedDistance = response.choices[0].message.content.trim();
    return parseInt(estimatedDistance, 10) || 20; // Default to 20px if the model response is unclear
}

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

    if (functionCall.name === "draw_circle" || functionCall.name === "draw_triangle") {
        // Draw shape and store it
        const shapeDetails = JSON.parse(functionCall.arguments);
        shapeDetails.id = shapeCounter++;
        shapes.push(shapeDetails);
    } else if (functionCall.name === "move_shape") {
        const moveDetails = JSON.parse(functionCall.arguments);
        const { shape_id, direction } = moveDetails;

        // Estimate the distance based on the user prompt
        const distance = await getMovementDistanceFromPrompt(userPrompt);

        // Find the shape to move
        const shape = shapes.find(s => s.id === shape_id);
        if (shape) {
            switch (direction) {
                case 'up':
                    shape.y -= distance;
                    break;
                case 'down':
                    shape.y += distance;
                    break;
                case 'left':
                    shape.x -= distance;
                    break;
                case 'right':
                    shape.x += distance;
                    break;
            }
        }
    }

    res.json(functionCall);
});

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
