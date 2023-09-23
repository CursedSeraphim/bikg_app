import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux'; // Importing useDispatch
import { OpenAI } from 'langchain/llms/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { DynamicTool, WolframAlphaTool } from 'langchain/tools';
import './Chatbot.css';
import { v4 as uuidv4 } from 'uuid';
import { setSelectedTypes } from '../Store/CombinedSlice';

const model = new OpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo-0613', openAIApiKey: process.env.OPENAI_API_KEY });
// const wolframTool = new WolframAlphaTool({ appid: process.env.WOLFRAM_ALPHA_APPID });

let executor;

function LangchainComponent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false); // New state to handle loading indication
  const dispatch = useDispatch();

  const parseArrayString = (arrayString) => {
    const array = arrayString.replace(/[\[\]\s]/g, '').split(',');
    const lowerCaseFirstLetter = (str) => {
      // Remove surrounding quotes if present
      const strippedStr = str.replace(/^"|"$/g, '');
      // Convert first letter to lowercase and return
      return strippedStr.charAt(0).toLowerCase() + strippedStr.slice(1);
    };
    return array.filter((item) => item).map(lowerCaseFirstLetter);
  };

  const handleLLMSetTypes = (a) => {
    const parsedArray = parseArrayString(a);
    dispatch(setSelectedTypes(parsedArray));
    console.log('returning "Selected types have been set."');
    return a;
  }; // this has the type error

  // Define tools inside the component to access handleLLMSetTypes
  const tools = [
    // wolframTool,
    new DynamicTool({
      name: 'select_types',
      func: handleLLMSetTypes,
      description:
        'useful for when you need to select an array of certain type or owl:Class nodes in the knowledge graph ontology, e.g., ["Omics:Donor", "Omics:Sample"]',
    }),
  ];

  useEffect(() => {
    initializeAgentExecutorWithOptions(tools, model, { agentType: 'zero-shot-react-description', verbose: true }).then((res) => {
      executor = res;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] means run once on component mount

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
