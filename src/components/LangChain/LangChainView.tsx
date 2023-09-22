import React, { useState, useEffect } from 'react';
import { OpenAI } from 'langchain/llms/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { WolframAlphaTool } from 'langchain/tools';
import './Chatbot.css';
import { v4 as uuidv4 } from 'uuid';

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
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false); // New state to handle loading indication

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Immediately add user's message to the messages array with unique ID
    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: input, isUser: true }]);

    setInput(''); // Clear the input field
    setIsBotTyping(true); // Show the loading indicator

    const result = await executor.call({ input });

    // Add bot's reply to the messages array with unique ID
    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: result.output, isUser: false }]);

    setIsBotTyping(false); // Hide the loading indicator
  };

  return (
    <div className="chat-container">
      <div className="chat-history">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.isUser ? 'user' : 'bot'}`}>
            {message.content}
          </div>
        ))}
        {isBotTyping && <div className="chat-message bot typing-indicator">Typing...</div>} {/* Loading indicator */}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input type="text" value={input} onChange={handleInputChange} placeholder="Type your message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default LangchainComponent;
