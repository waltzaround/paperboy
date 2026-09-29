const OPENAI_MODEL = 'gpt-6-luna';

// Function to call OpenAI GPT-6 Luna directly. The API key is passed in so this
// works in both Node (process.env) and the Worker (env bindings).
async function generateWithOpenAI(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const url = 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
    model: OPENAI_MODEL,
    messages: [{
      role: 'user',
      content: prompt
    }],
    response_format: { type: 'json_object' },
    reasoning_effort: 'medium',
    max_completion_tokens: 32000,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status} ${errorBody}`);
    }

    const data = await response.json();

    const choice = data.choices && data.choices[0];
    if (choice && choice.message && choice.message.content) {
      if (choice.finish_reason === 'length') {
        throw new Error('OpenAI response was truncated (hit max_completion_tokens)');
      }
      return choice.message.content;
    } else {
      throw new Error('Unexpected response structure from OpenAI API');
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

export { generateWithOpenAI, OPENAI_MODEL };
