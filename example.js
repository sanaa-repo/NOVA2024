const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: TEAM_API_KEY, // set this!!
  baseURL: PROXY_ENDPOINT // and this!!
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'How are you?' }],
    model: 'openai/gpt-4o',
  });
  console.log(chatCompletion.choices[0].message.content);
}

main();
