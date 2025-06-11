// useInitializeAgentExecutor.ts
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { useEffect } from 'react';
import { PREFIX, SUFFIX } from './promptConstants';

export function useInitializeAgentExecutor(tools, model, executorRef) {
  useEffect(() => {
    initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'chat-conversational-react-description',
      verbose: true,
      agentArgs: {
        systemMessage: PREFIX,
        humanMessage: SUFFIX,
      },
    }).then((res) => {
      // eslint-disable-next-line no-param-reassign
      executorRef.current = res;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools, model]);
}
