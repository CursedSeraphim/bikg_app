// useInitializeAgentExecutor.ts
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { useEffect } from 'react';

export function useInitializeAgentExecutor(tools, model, executorRef) {
  useEffect(() => {
    initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'zero-shot-react-description',
      verbose: true,
    }).then((res) => {
      executorRef.current = res;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools, model]);
}
