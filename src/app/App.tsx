"use client";

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";
import TokenCounter from "./components/TokenCounter";

// Types
import { SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useTokenContext } from "@/app/contexts/TokenContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets } from "@/app/agentConfigs";

function App() {

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();
  const { incrementInputTokens, incrementOutputTokens } = useTokenContext();

  // Luna is our only agent now, directly import it
  const lunaAgent = allAgentSets["personalAssistant"][0];

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(true);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(false);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState<boolean>(false);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName: lunaAgent.name,
    selectedAgentConfigSet: allAgentSets["personalAssistant"],
    sendClientEvent,
    incrementInputTokens,
    incrementOutputTokens,
  });

  useEffect(() => {
    // Connect to realtime directly when app initializes
    connectToRealtime();
  }, []);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      addTranscriptBreadcrumb(
        `Agent: ${lunaAgent.name}`,
        lunaAgent
      );
      // We need to wait for the function to complete
      (async () => {
        await updateSession();
      })();
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`
      );
      updateSession();
    }
  }, [isPTTActive]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      // When the microphone state changes, we need to reconnect with the new state
      // This ensures we either get a real microphone track or a silent track
      if (pcRef.current) {
        // First stop any existing tracks
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            track.stop();
          });
        }
        
        // Reconnect with new microphone state and update the session afterwards
        (async () => {
          try {
            // Wait for WebRTC reconnection to complete before updating session
            await connectToRealtime(true);
            
            // Give a small delay to ensure connection is fully established
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Update the session with the new microphone state
            await updateSession();
            
            console.log("Microphone toggle completed with session update");
          } catch (error) {
            console.error("Error during microphone toggle:", error);
          }
        })();
      }
    }
  }, [isMicrophoneEnabled, sessionStatus]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async (isReconnectingForMicToggle = false): Promise<RTCDataChannel | undefined> => {
    // Allow reconnection if microphone was toggled or we're explicitly reconnecting
    const isReconnecting = 
      (sessionStatus === "CONNECTED" && isMicrophoneEnabled && !mediaStream) || 
      isReconnectingForMicToggle;
    
    if (sessionStatus !== "DISCONNECTED" && !isReconnecting) return undefined;
    
    if (!isReconnecting) {
      setSessionStatus("CONNECTING");
    }

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return undefined;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      // Clean up any existing connection before creating a new one
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        pcRef.current.close();
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      const { pc, dc, track, stream } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef,
        isMicrophoneEnabled
      );
      
      // We always have a track and stream now (either real or silent)
      setAudioTrack(track);
      setMediaStream(stream);

      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        const eventData = JSON.parse(e.data);
        // Dispatch a custom event so our speech cancellation detection can work
        document.dispatchEvent(new CustomEvent("serverEvent", { detail: eventData }));
        
        // Track token usage if available in the server event
        if (eventData.token_usage) {
          if (eventData.token_usage.input_tokens) {
            incrementInputTokens(eventData.token_usage.input_tokens);
          }
          if (eventData.token_usage.output_tokens) {
            incrementOutputTokens(eventData.token_usage.output_tokens);
          }
        }
        
        handleServerEventRef.current(eventData);
      });

      setDataChannel(dc);
      
      // Create a promise to wait for the data channel to be fully established
      if (isReconnectingForMicToggle) {
        // Wait for the data channel to open
        if (dc.readyState !== "open") {
          await new Promise<void>((resolve) => {
            const checkOpen = () => {
              if (dc.readyState === "open") {
                resolve();
                dc.removeEventListener("open", checkOpen);
              }
            };
            
            dc.addEventListener("open", checkOpen);
            
            // If it's already open, resolve immediately
            if (dc.readyState === "open") {
              resolve();
            }
          });
        }
      }
      
      // Return explicitly to make the function awaitable
      return dc;
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
      throw err; // Re-throw to allow proper error handling by caller
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Stop and clean up media stream - we always have one now (either real or silent)
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      setMediaStream(null);
    }
    
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
    setAudioTrack(null);

    logClientEvent({}, "disconnected");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = async () => {
    // Check if we're properly connected before updating session
    if (sessionStatus !== "CONNECTED" || !dcRef.current || dcRef.current.readyState !== "open") {
      console.warn("Cannot update session - not properly connected");
      return false;
    }
    
    // Check for any ongoing assistant speech and cancel it if needed
    const isSafeToProceed = await cancelAssistantSpeech();
    
    if (!isSafeToProceed) {
      console.warn("Cannot update session - assistant audio still present");
      // Try again after a delay
      setTimeout(() => updateSession(), 500);
      return false;
    }
    
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };

    const instructions = lunaAgent?.instructions || "";
    const tools = lunaAgent?.tools || [];
    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);
    
    // Return true to indicate the session was updated successfully
    return true;
  };

  const cancelAssistantSpeech = async () => {
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return true; // No assistant speech to cancel, so we're good to proceed
    }
    
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return true; // Assistant message is done, so we're good to proceed
    }

    console.log("Cancelling assistant speech...");
    
    // Return a promise that resolves when speech is fully cancelled
    return new Promise<boolean>((resolve) => {
      // Set a timeout to ensure we don't wait forever
      const timeoutId = setTimeout(() => {
        console.log("Speech cancellation timed out");
        resolve(false); // Timeout occurred, not safe to proceed
      }, 1000); // 1 second timeout
      
      // Create a one-time event listener to detect when cancellation is complete
      const checkCancellationComplete = (event: any) => {
        if (
          event.type === "response.output_item.done" ||
          (event.type === "conversation.item.truncate.completed" && 
          event.item_id === mostRecentAssistantMessage.itemId)
        ) {
          clearTimeout(timeoutId);
          document.removeEventListener("serverEvent", checkCancellationComplete);
          console.log("Speech cancellation completed");
          resolve(true); // Cancellation confirmed, safe to proceed
        }
      };
      
      // Add event listener to detect when cancellation is complete
      document.addEventListener("serverEvent", checkCancellationComplete);
      
      // Send events to cancel speech
      sendClientEvent({
        type: "conversation.item.truncate",
        item_id: mostRecentAssistantMessage?.itemId,
        content_index: 0,
        audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
      });
      
      sendClientEvent(
        { type: "response.cancel" },
        "(cancel due to user interruption)"
      );
    });
  };

  const handleSendTextMessage = async () => {
    if (!userText.trim()) return;
    
    // Wait for assistant speech to be fully cancelled before proceeding
    const isSafeToProceed = await cancelAssistantSpeech();
    
    if (!isSafeToProceed) {
      console.warn("Cannot send message - assistant audio still present");
      return;
    }
    
    const messageText = userText.trim();
    setUserText(""); // Clear input field immediately for better UX

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: messageText }],
        },
      },
      "(send user text message)"
    );

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  const handleTalkButtonDown = async () => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    
    // No need to check isMicrophoneEnabled here, as we'll always have an audio track
    // The track will be either a real microphone or a silent track
    
    // Cancel any ongoing assistant speech and wait for it to complete
    const isSafeToProceed = await cancelAssistantSpeech();
    
    if (!isSafeToProceed) {
      console.warn("Not safe to proceed with PTT - assistant audio still present");
      return;
    }
    
    // Only proceed if we successfully cancelled any assistant speech
    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = async () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;
      
    // No need to check isMicrophoneEnabled, as handleTalkButtonDown won't set isPTTUserSpeaking
    // if the connection isn't in the right state
    
    // Double-check that there's no assistant speech before committing
    const isSafeToProceed = await cancelAssistantSpeech();
    
    if (!isSafeToProceed) {
      console.warn("Cannot commit PTT buffer - assistant audio still present");
      setIsPTTUserSpeaking(false); // Reset state
      return;
    }

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    
    // Slight delay to ensure buffer is committed before requesting response
    setTimeout(() => {
      sendClientEvent({ type: "response.create" }, "trigger response PTT");
    }, 100);
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };


  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
    const storedMicrophoneEnabled = localStorage.getItem("microphoneEnabled");
    if (storedMicrophoneEnabled) {
      setIsMicrophoneEnabled(storedMicrophoneEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    localStorage.setItem("microphoneEnabled", isMicrophoneEnabled.toString());
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);


  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      {/* Token Counter */}
      <TokenCounter />
      
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div className="flex items-center">
          <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            <Image
              src="/openai-logomark.svg"
              alt="OpenAI Logo"
              width={20}
              height={20}
              className="mr-2"
            />
          </div>
          <div>
            Realtime API <span className="text-gray-500">Agents</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-base font-medium">Luna Personal Assistant</span>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          canSend={
            sessionStatus === "CONNECTED" &&
            dcRef.current?.readyState === "open"
          }
        />

        <Events isExpanded={isEventsPaneExpanded} />
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        isMicrophoneEnabled={isMicrophoneEnabled}
        setIsMicrophoneEnabled={setIsMicrophoneEnabled}
      />
    </div>
  );
}

export default App;
