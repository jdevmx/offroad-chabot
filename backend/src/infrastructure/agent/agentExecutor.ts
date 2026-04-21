import { ChatMistralAI } from '@langchain/mistralai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createTavilySearchTool } from './tools/tavilySearch.tool';
import { FirestoreChatMemory } from './memory/firestoreMemory';

const MAX_ITERATIONS = 10;

export interface RunAgentParams {
  message: string;
  systemPrompt: string;
  memory: FirestoreChatMemory;
  llm?: BaseChatModel;
  tools?: DynamicStructuredTool[];
}

export interface RunAgentResult {
  message: string;
  toolsUsed: string[];
}

function parseHistory(history: string): BaseMessage[] {
  if (!history) return [];
  const messages: BaseMessage[] = [];
  for (const line of history.split('\n')) {
    if (line.startsWith('Human: ')) {
      messages.push(new HumanMessage(line.slice(7)));
    } else if (line.startsWith('Assistant: ')) {
      messages.push(new AIMessage(line.slice(11)));
    }
  }
  return messages;
}

function createDefaultLlm(): BaseChatModel {
  return new ChatMistralAI({
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-medium-latest',
  });
}

export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { message, systemPrompt, memory } = params;
  const llm = params.llm ?? createDefaultLlm();
  const tools = params.tools ?? [createTavilySearchTool()];

  const { history } = await memory.loadMemoryVariables();

  const toolMap = new Map(tools.map(t => [t.name, t]));
  const toolsUsed: string[] = [];

  const llmWithTools = llm.bindTools ? llm.bindTools(tools) : llm;

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...parseHistory(history),
    new HumanMessage(message),
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await llmWithTools.invoke(messages);
    messages.push(response as AIMessage);

    const aiResponse = response as AIMessage;
    if (!aiResponse.tool_calls?.length) {
      const output =
        typeof aiResponse.content === 'string'
          ? aiResponse.content
          : JSON.stringify(aiResponse.content);

      await memory.saveContext(message, output);
      return { message: output, toolsUsed };
    }

    for (const toolCall of aiResponse.tool_calls) {
      const tool = toolMap.get(toolCall.name);
      if (!tool) continue;

      toolsUsed.push(toolCall.name);
      const result = await tool.invoke(toolCall.args as Record<string, unknown>);
      messages.push(new ToolMessage({ content: String(result), tool_call_id: toolCall.id ?? '' }));
    }
  }

  throw new Error('Agent exceeded maximum iterations');
}
