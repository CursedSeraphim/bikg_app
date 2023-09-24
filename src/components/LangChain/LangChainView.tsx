// LangChainView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { OpenAI } from 'langchain/llms/openai';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import './Chatbot.css';
import { v4 as uuidv4 } from 'uuid';
import { createTools } from './tools';

function LangchainComponent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const dispatch = useDispatch();
  const executorRef = useRef<AgentExecutor | null>(null);

  const model = useMemo(
    () =>
      new OpenAI({
        temperature: 0,
        modelName: 'gpt-3.5-turbo-0613',
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
    [],
  );

  const tools = useMemo(() => createTools(dispatch), [dispatch]);

  useEffect(() => {
    initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'zero-shot-react-description',
      verbose: true,
    }).then((res) => {
      executorRef.current = res;
    });
  }, [tools, model]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: input, isUser: true }]);

    setInput('');
    setIsBotTyping(true);

    const result = await executorRef.current.call({ input });

    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: result.output, isUser: false }]);

    setIsBotTyping(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-history">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.isUser ? 'user' : 'bot'}`}>
            {message.content}
          </div>
        ))}
        {isBotTyping && <div className="chat-message bot typing-indicator">Typing...</div>}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input type="text" value={input} onChange={handleInputChange} placeholder="Type your message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default LangchainComponent;
