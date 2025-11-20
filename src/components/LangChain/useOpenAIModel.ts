import { OpenAI } from 'langchain/llms/openai';
import { useMemo } from 'react';

export const useOpenAIModel = (openAIApiKey, modelName = 'gpt-4.1') => {
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
