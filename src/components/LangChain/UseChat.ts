// UseChat.ts
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { HumanMessage, AIMessage, SystemMessage } from 'langchain/schema';
import { PREFIX } from './promptConstants';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([new SystemMessage(PREFIX)]);

  const addMessage = (content, isUser = true) => {
    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content, isUser }]);
    setChatHistory((prev) => [
      ...prev,
      isUser ? new HumanMessage(content) : new AIMessage(content),
    ]);
  };

  return { messages, addMessage, chatHistory };
};
