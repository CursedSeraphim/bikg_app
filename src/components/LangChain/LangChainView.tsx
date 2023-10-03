// LangChainView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OpenAI } from 'langchain/llms/openai';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import './Chatbot.css';
import { v4 as uuidv4 } from 'uuid';
import useTools from './tools';

function LangchainComponent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const executorRef = useRef<AgentExecutor | null>(null);
  // 1. Add a ref to track the chat history container
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  // 2. Add a state to track if the user has scrolled up manually
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  useEffect(() => {
    const chatHistoryEl = chatHistoryRef.current;

    const handleScroll = () => {
      // Check if the user has scrolled up, i.e., if scrollTop + offsetHeight is less than the scrollHeight.
      if (chatHistoryEl) {
        setHasUserScrolled(chatHistoryEl.scrollTop + chatHistoryEl.offsetHeight < chatHistoryEl.scrollHeight);
      }
    };

    // Automatically scroll down when a new message is added and user has not scrolled up
    if (chatHistoryEl && !hasUserScrolled) {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    // Add an event listener to the chat history container
    chatHistoryEl?.addEventListener('scroll', handleScroll);

    // Cleanup - remove the event listener when component unmounts
    return () => {
      chatHistoryEl?.removeEventListener('scroll', handleScroll);
    };
  }, [messages, hasUserScrolled]); // Re-run effect when messages change or hasUserScrolled state changes

  const model = useMemo(
    () =>
      new OpenAI({
        temperature: 0,
        modelName: 'gpt-3.5-turbo-0613',
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
    [],
  );

  const tools = useTools();

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
      {/* 3. Add a ref to the chat history container */}
      <div ref={chatHistoryRef} className="chat-history">
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
