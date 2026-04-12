const OpenAI = require('openai');
const client = new OpenAI({
  apiKey: 'sk-sp-d831262f452643ca9371310d336ef97e',
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1'
});
async function run() {
  try {
    const res = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [{ type: 'function', function: { name: 'replace_editor_content', description: 'desc', parameters: { type: 'object', properties: { html: { type: 'string' } } } } }],
      tool_choice: 'auto'
    });
    console.log('Success:', res.choices[0].message);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
