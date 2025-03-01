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
    
    // Log all server events to understand their structure
    console.log('Server Event Received:', serverEvent);
    console.log('Server Event Type:', serverEvent.type);
    console.log('Full Server Event Data:', JSON.stringify(serverEvent, null, 2));

    // Track token usage if available in the server event
    console.log('Checking for token_usage property:', 'token_usage' in serverEvent);
    
    // Check if top-level event has token usage
    if ('token_usage' in serverEvent) {
      console.log('Token usage property found:', (serverEvent as any).token_usage);
      const tokenUsage = (serverEvent as any).token_usage;
      if (tokenUsage) {
        console.log('Token usage details:', tokenUsage);
        if (tokenUsage.input_tokens) {
          const inputCount = tokenUsage.input_tokens;
          console.log('Input tokens found:', inputCount);
          if (incrementInputTokens) {
            incrementInputTokens(inputCount);
          } else {
            tokenContext.incrementInputTokens(inputCount);
          }
        }
        
        if (tokenUsage.output_tokens) {
          const outputCount = tokenUsage.output_tokens;
          console.log('Output tokens found:', outputCount);
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
      console.log('Found usage in response:', (serverEvent as any).response.usage);
      const usage = (serverEvent as any).response.usage;
      
      if (usage) {
        if (usage.input_tokens) {
          const inputCount = usage.input_tokens;
          console.log('Input tokens found in response.usage:', inputCount);
          if (incrementInputTokens) {
            incrementInputTokens(inputCount);
          } else {
            tokenContext.incrementInputTokens(inputCount);
          }
        }
        
        if (usage.output_tokens) {
          const outputCount = usage.output_tokens;
          console.log('Output tokens found in response.usage:', outputCount);
          if (incrementOutputTokens) {
            incrementOutputTokens(outputCount);
          } else {
            tokenContext.incrementOutputTokens(outputCount);
          }
        }
      }
    } 
    // Log other potential locations for token information
    else {
      console.log('No token usage information found in expected locations. Looking for alternatives...');
      
      // Check usage property at top level
      if ('usage' in serverEvent) {
        console.log('Found usage property at top level:', (serverEvent as any).usage);
      }
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
        console.log('Response done event:', serverEvent);
        console.log('Response object details:', serverEvent.response);
        
        // Check if response contains token usage information
        // Check if response contains token usage information
        if (serverEvent.response && 'usage' in serverEvent.response) {
          console.log('Token usage in response.done:', (serverEvent as any).response.usage);
          
          const usage = (serverEvent as any).response.usage;
          if (usage) {
            if (usage.input_tokens) {
              console.log('Found input_tokens in response.done:', usage.input_tokens);
              if (incrementInputTokens) {
                incrementInputTokens(usage.input_tokens);
              } else {
                tokenContext.incrementInputTokens(usage.input_tokens);
              }
            }
            
            if (usage.output_tokens) {
              console.log('Found output_tokens in response.done:', usage.output_tokens);
              if (incrementOutputTokens) {
                incrementOutputTokens(usage.output_tokens);
              } else {
                tokenContext.incrementOutputTokens(usage.output_tokens);
              }
            }

            // For total tokens, we might want to log this separately
            if (usage.total_tokens) {
              console.log('Total tokens used in this response:', usage.total_tokens);
            }
          }
        
        if (serverEvent.response?.output) {
          console.log('Response output items:', serverEvent.response.output);
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              console.log('Function call output item:', outputItem);
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
