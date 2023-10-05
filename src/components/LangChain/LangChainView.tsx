// LangChainView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OpenAI } from 'langchain/llms/openai';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import './Chatbot.css';
import { v4 as uuidv4 } from 'uuid';
import useTools from './tools';
import { ChatUI } from './ChatUI';

function LangchainComponent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const executorRef = useRef<AgentExecutor | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  // code for auto-scrolling behavior
  useEffect(() => {
    const chatHistoryEl = chatHistoryRef.current;

    const handleScroll = () => {
      if (chatHistoryEl) {
        setHasUserScrolled(chatHistoryEl.scrollTop + chatHistoryEl.offsetHeight < chatHistoryEl.scrollHeight);
      }
    };

    if (chatHistoryEl && !hasUserScrolled) {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    chatHistoryEl?.addEventListener('scroll', handleScroll);

    return () => {
      chatHistoryEl?.removeEventListener('scroll', handleScroll);
    };
  }, [messages, hasUserScrolled]);

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

    try {
      const result = await executorRef.current.call({ input });
      setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: result.output, isUser: false }]);
    } catch (error) {
      console.log('error', error);
      setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content: JSON.stringify(error.message), isUser: false }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <ChatUI
      messages={messages}
      isBotTyping={isBotTyping}
      onSendMessage={handleSubmit}
      chatHistoryRef={chatHistoryRef}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
    />
  );
}

export default LangchainComponent;
