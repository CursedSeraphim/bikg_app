// UseChat.ts
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const useChat = () => {
  const [messages, setMessages] = useState([]);

  const addMessage = (content, isUser = true) => {
    setMessages((prevMessages) => [...prevMessages, { id: uuidv4(), content, isUser }]);
  };

  return { messages, addMessage };
};
