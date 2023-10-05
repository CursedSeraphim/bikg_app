// LangChainView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import './Chatbot.css';
import useTools from './tools';
import { ChatUI } from './ChatUI';
import { useOpenAIModel } from './useOpenAIModel';
import { useChat } from './UseChat';

function LangchainComponent() {
  const [input, setInput] = useState('');
  const { messages, addMessage } = useChat();
  const [isBotTyping, setIsBotTyping] = useState(false);
  const executorRef = useRef<AgentExecutor | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const openAIApiKey = process.env.OPENAI_API_KEY;

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

  const model = useOpenAIModel(openAIApiKey);

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

    addMessage(input, true);

    setInput('');
    setIsBotTyping(true);

    try {
      const result = await executorRef.current.call({ input });
      addMessage(result.output, false);
    } catch (error) {
      console.log('error', error);
      addMessage(JSON.stringify(error.message), false);
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
