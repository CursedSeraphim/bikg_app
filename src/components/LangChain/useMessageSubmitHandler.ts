// useMessageSubmitHandler.ts
import { useCallback } from 'react';

export function useMessageSubmitHandler(input, executorRef, setIsBotTyping, addMessage, setInput, chatHistory) {
  return useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const historyForCall = chatHistory;
      addMessage(input, true);
      setInput('');
      setIsBotTyping(true);

      try {
        const result = await executorRef.current.call({ input, chat_history: historyForCall });
        addMessage(result.output, false);
      } catch (error) {
        console.log('error', error);
        addMessage(JSON.stringify(error.message), false);
      } finally {
        setIsBotTyping(false);
      }
    },
    [input, executorRef, setIsBotTyping, addMessage, setInput, chatHistory],
  );
}
