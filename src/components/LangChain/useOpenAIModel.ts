import { useMemo } from 'react';
import { OpenAI } from 'langchain/llms/openai';

export const useOpenAIModel = (openAIApiKey, modelName = 'gpt-4-1106-preview') => {
  const model = useMemo(() => {
    if (!openAIApiKey) {
      return null;
    }

    try {
      return new OpenAI({
        temperature: 0,
        modelName,
        openAIApiKey,
      });
    } catch (e) {
      return null;
    }
  }, [openAIApiKey, modelName]);

  return model;
};
