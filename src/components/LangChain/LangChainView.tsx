import React, { useState, useEffect } from 'react';
import { OpenAI } from 'langchain/llms/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { WolframAlphaTool } from 'langchain/tools';

// Initialize the language model
const model = new OpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo-0613', openAIApiKey: process.env.OPENAI_API_KEY });

// Initialize the WolframAlpha tool
const wolframTool = new WolframAlphaTool({ appid: process.env.WOLFRAM_ALPHA_APPID });

// Define your tools
const tools = [wolframTool];

// Initialize the agent executor
let executor;
initializeAgentExecutorWithOptions(tools, model, { agentType: 'zero-shot-react-description', verbose: true }).then((res) => {
  executor = res;
});

function LangchainComponent() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await executor.call({ input });
    setOutput(result.output);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Input:
          <input type="text" value={input} onChange={handleInputChange} />
        </label>
        <input type="submit" value="Submit" />
      </form>
      <div>Output: {output}</div>
    </div>
  );
}

export default LangchainComponent;
