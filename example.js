const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: "sk-5UdUdZqd1543Q-wnfsRaoA",
  baseURL: "https://nova-litellm-proxy.onrender.com"
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'How are you?' }],
    model: 'openai/gpt-4o',
  });
  console.log(chatCompletion.choices[0].message.content);
}

main();
