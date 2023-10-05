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
  const openAIApiKey = process.env.OPENAI_API_KEY;
  console.log('openAIApiKey', openAIApiKey);

  useAutoScroll(messages, chatHistoryRef);
  const model = useOpenAIModel(openAIApiKey);
  const tools = useTools();
  useInitializeAgentExecutor(tools, model, executorRef);
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };
  const handleSubmit = useMessageSubmitHandler(input, executorRef, setIsBotTyping, addMessage, setInput);
  if (!model) {
    return <div>Model is not loaded, please check your API key.</div>;
  }

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
