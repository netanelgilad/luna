"use client";

import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useTokenContext } from "@/app/contexts/TokenContext";
import { useRef } from "react";

export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  shouldForceResponse?: boolean;
  incrementInputTokens?: (count: number) => void;
  incrementOutputTokens?: (count: number) => void;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  incrementInputTokens,
  incrementOutputTokens,
}: UseHandleServerEventParams) {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  const tokenContext = useTokenContext();

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments);
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(args, transcriptItems);
      addTranscriptBreadcrumb(
        `function call result: ${functionCallParams.name}`,
        fnResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    } else if (functionCallParams.name === "transferAgents") {
      // Simplified agent transfer logic since we only have Luna agent
      // Always staying with the current Luna agent
      const functionCallOutput = {
        destination_agent: selectedAgentName, // Always return the current agent (Luna)
        did_transfer: false, // No transfer needed since we only have one agent
        message: "Using Luna assistant only"
      };
      
      // Keep event communication intact
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent);
    
    // Track token usage if available in the server event
    
    // Check if top-level event has token usage
    if ('token_usage' in serverEvent) {
      const tokenUsage = (serverEvent as any).token_usage;
      if (tokenUsage) {
        if (tokenUsage.input_tokens) {
          const inputCount = tokenUsage.input_tokens;
          if (incrementInputTokens) {
            incrementInputTokens(inputCount);
          } else {
            tokenContext.incrementInputTokens(inputCount);
          }
        }
        
        if (tokenUsage.output_tokens) {
          const outputCount = tokenUsage.output_tokens;
          if (incrementOutputTokens) {
            incrementOutputTokens(outputCount);
          } else {
            tokenContext.incrementOutputTokens(outputCount);
          }
        }
      }
    } 
    // Check if response object has usage information
    else if (serverEvent.response && 'usage' in serverEvent.response) {
      const usage = (serverEvent as any).response.usage;
      
      if (usage) {
        if (usage.input_tokens) {
          const inputCount = usage.input_tokens;
          if (incrementInputTokens) {
            incrementInputTokens(inputCount);
          } else {
            tokenContext.incrementInputTokens(inputCount);
          }
        }
        
        if (usage.output_tokens) {
          const outputCount = usage.output_tokens;
          if (incrementOutputTokens) {
            incrementOutputTokens(outputCount);
          } else {
            tokenContext.incrementOutputTokens(outputCount);
          }
        }
      }
    } 
    // Check for other potential locations for token information
    else if ('usage' in serverEvent) {
      // If there's a usage property at the top level, could handle it here if needed
    }

    switch (serverEvent.type) {
      case "session.created": {
        if (serverEvent.session?.id) {
          setSessionStatus("CONNECTED");
          addTranscriptBreadcrumb(
            `session.id: ${
              serverEvent.session.id
            }\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      case "conversation.item.created": {
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          break;
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]";
          }
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      case "response.done": {
        // Check if response contains token usage information
        if (serverEvent.response && 'usage' in serverEvent.response) {
          const usage = (serverEvent as any).response.usage;
          if (usage) {
            if (usage.input_tokens) {
              if (incrementInputTokens) {
                incrementInputTokens(usage.input_tokens);
              } else {
                tokenContext.incrementInputTokens(usage.input_tokens);
              }
            }
            
            if (usage.output_tokens) {
              if (incrementOutputTokens) {
                incrementOutputTokens(usage.output_tokens);
              } else {
                tokenContext.incrementOutputTokens(usage.output_tokens);
              }
            }
          }
        }
        
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItemStatus(itemId, "DONE");
        }
        break;
      }

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}
