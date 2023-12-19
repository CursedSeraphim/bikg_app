// LangChainView.tsx
import React, { useState, useRef } from 'react';
import { AgentExecutor } from 'langchain/agents';
import './ChatStyle.css';
import useTools from './tools';
import { ChatUI } from './ChatUI';
import { useOpenAIModel } from './useOpenAIModel';
import { useChat } from './UseChat';
import { useInitializeAgentExecutor } from './useInitializeAgentExecutor';
import { useMessageSubmitHandler } from './useMessageSubmitHandler';
import useAutoScroll from './useAutoScroll';

function LangchainComponent() {
  const [input, setInput] = useState('');
  const { messages, addMessage } = useChat();
  const [isBotTyping, setIsBotTyping] = useState(false);
  const executorRef = useRef<AgentExecutor | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  // const openAIApiKey = process.env.OPENAI_API_KEY;
  const [apiKey, setApiKey] = useState(process.env.OPENAI_API_KEY);
  const [apiKeyError, setApiKeyError] = useState(false); // New state for API key error

  useAutoScroll(messages, chatHistoryRef);
  const model = useOpenAIModel(apiKey);
  const tools = useTools();
  useInitializeAgentExecutor(tools, model, executorRef);
  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };
  const handleApiKeySubmit = () => {
    // Update your environment variable here or send the key to your backend
    // Reset the error state
    setApiKeyError(false);
  };
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };
  const handleSubmit = useMessageSubmitHandler(input, executorRef, setIsBotTyping, addMessage, setInput);
  if (!model && !apiKeyError) {
    setApiKeyError(true);
  }

  return (
    <ChatUI
      messages={messages}
      isBotTyping={isBotTyping}
      chatHistoryRef={chatHistoryRef}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
      apiKey={apiKey}
      handleApiKeyChange={handleApiKeyChange}
      handleApiKeySubmit={handleApiKeySubmit}
    />
  );
}

export default LangchainComponent;
