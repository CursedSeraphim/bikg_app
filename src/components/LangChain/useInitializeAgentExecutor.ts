// src/components/LangChain/useInitializeAgentExecutor.ts
import { initializeAgentExecutorWithOptions, type AgentExecutor } from 'langchain/agents';
import { BufferMemory } from 'langchain/memory';
import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

export function useInitializeAgentExecutor(tools: any[], model: any, executorRef: MutableRefObject<AgentExecutor | null>) {
  useEffect(() => {
    if (!model || !tools || tools.length === 0) {
      executorRef.current = null;
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const memory = new BufferMemory({
          returnMessages: true,
          memoryKey: 'chat_history',
          inputKey: 'input',
        });

        const exec = await initializeAgentExecutorWithOptions(tools, model, {
          // required valid agent type
          agentType: 'chat-conversational-react-description',
          verbose: true,
          memory,
          agentArgs: {
            // Only variables: input, agent_scratchpad, chat_history
            prefix: `You are a precise, data-driven assistant.
        1. Start by looking at the original RDF data.
        2.  think "Do I need additional tools and which ones?"
        3. If yes, call the appropriate tools. If there isn't a specific tool for directly addressing a request:
        a) To locate entities and evidence, first call the tool "grep_around" with a focused search term.
          It returns line-numbered snippets and IRI candidates from ontology, instance, and report texts.
        b) Use the returned IRI candidates to refine further "grep_around" calls (e.g., search the exact IRI).
        4. then ALWAYS think "Can I select/highlight the data I am giving information about in this visualization app by calling the appropriate tools?"
        5. If yes, call the appropriate tools. For instance, by calling select_types (the class of a node), select_constraints (the SHACL constraint of a node), or select_reported_violations (the reported violation of a node) tools.
        The reported violation will have some suffix like _group_6 because it is a grouping of similar violations.
        6. Base the final answer exactly on that data and if you selected something inform the user about it.

        IMPORTANT: Never assume semantics from IRI substrings, e.g., "http://example.org/Strain/abc123" DOES NOT mean that the node is a "Strain"!

        If the user asks to describe what is selected in the app:
        1. use tools to get the information about what is selected
        2. look up the original RDF data to get the information about the selected data
        3. tell the user about what is selected with some context from the original RDF data.`,
            suffix: `Chat history:
{chat_history}

Begin.

Question: {input}
{agent_scratchpad}`,
            // Some LangChain versions need explicit input variables:
            inputVariables: ['input', 'agent_scratchpad', 'chat_history'],
          } as any,
        });

        if (!cancelled) {
          executorRef.current = exec;
        }
      } catch (err) {
        console.error('Agent initialization failed:', err);
        executorRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools, model]);
}
