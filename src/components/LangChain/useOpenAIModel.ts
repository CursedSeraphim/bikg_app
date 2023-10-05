// useOpenAIModel.ts
import { useMemo } from 'react';
import { OpenAI } from 'langchain/llms/openai';

export const useOpenAIModel = (openAIApiKey, modelName = 'gpt-3.5-turbo-0613') => {
  // TODO Add potential error handling for null/undefined apiKey

  return useMemo(
    () =>
      new OpenAI({
        temperature: 0,
        modelName,
        openAIApiKey,
      }),
    [openAIApiKey, modelName],
  );
};
