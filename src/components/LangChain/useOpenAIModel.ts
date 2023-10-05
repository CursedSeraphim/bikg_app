import { useMemo } from 'react';
import { OpenAI } from 'langchain/llms/openai';

export const useOpenAIModel = (openAIApiKey, modelName = 'gpt-3.5-turbo-0613') => {
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
