// LangChainView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import './ChatStyle.css';
import useTools from './tools';
import { ChatUI } from './ChatUI';
import { useOpenAIModel } from './useOpenAIModel';
import { useChat } from './UseChat';
import { useInitializeAgentExecutor } from './useInitializeAgentExecutor';
import { useMessageSubmitHandler } from './useMessageSubmitHandler';

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
  useInitializeAgentExecutor(tools, model, executorRef);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = useMessageSubmitHandler(input, executorRef, setIsBotTyping, addMessage, setInput);

  return (
    <ChatUI
      messages={messages}
      isBotTyping={isBotTyping}
      chatHistoryRef={chatHistoryRef}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
    />
  );
}

export default LangchainComponent;
