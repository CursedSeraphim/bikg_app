// src/components/LangChain/useMessageSubmitHandler.ts
import type { AgentExecutor } from 'langchain/agents';
import { useCallback } from 'react';

export function useMessageSubmitHandler(
  input: string,
  executorRef: React.RefObject<AgentExecutor | null>,
  setIsBotTyping: (v: boolean) => void,
  addMessage: (text: string, isUser: boolean) => void,
  setInput: (s: string) => void
) {
  return useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const trimmed = (input ?? '').trim();
      if (!trimmed) return;

      // If the agent hasn't initialized, show a clear message and bail early
      if (!executorRef.current) {
        addMessage('Model/agent not ready. Set an API key and wait a moment for initialization, then try again.', false);
        return;
      }

      addMessage(trimmed, true);
      setInput('');
      setIsBotTyping(true);

      try {
        const result = await executorRef.current.call({ input: trimmed });
        addMessage(result.output ?? '[No output]', false);
      } catch (error: any) {
        console.log('error', error);
        const msg = error?.message || String(error);
        addMessage(msg, false);
      } finally {
        setIsBotTyping(false);
      }
    },
    [input, executorRef, setIsBotTyping, addMessage, setInput],
  );
}
