import { RefObject } from "react";

// Helper function to create a silent audio track
async function createSilentAudioTrack(): Promise<{ track: MediaStreamTrack; stream: MediaStream }> {
  // Create an audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create an oscillator with 0 frequency (silent)
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 0;
  
  // Create a gain node and set volume to 0
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0;
  
  // Connect the oscillator to the gain node
  oscillator.connect(gainNode);
  
  // Create a media stream destination
  const destination = audioContext.createMediaStreamDestination();
  
  // Connect the gain node to the destination
  gainNode.connect(destination);
  
  // Start the oscillator
  oscillator.start();
  
  // Return the track and stream
  return { 
    track: destination.stream.getAudioTracks()[0],
    stream: destination.stream 
  };
}

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>,
  enableMicrophone: boolean = true
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; track: MediaStreamTrack | null; stream: MediaStream | null }> {
  const pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    if (audioElement.current) {
        audioElement.current.srcObject = e.streams[0];
    }
  };

  let ms = null;
  let audioTrack = null;
  
  if (enableMicrophone) {
    // Use the real microphone
    ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioTrack = ms.getTracks()[0];
  } else {
    // Create a silent audio track
    const silentAudio = await createSilentAudioTrack();
    audioTrack = silentAudio.track;
    ms = silentAudio.stream;
  }
  
  // Always add an audio track to ensure a valid SDP offer
  pc.addTrack(audioTrack, ms);
  
  const dc = pc.createDataChannel("oai-events");

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview-2024-12-17";

  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      "Content-Type": "application/sdp",
    },
  });

  const answerSdp = await sdpResponse.text();
  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: answerSdp,
  };

  await pc.setRemoteDescription(answer);

  return { pc, dc, track: audioTrack, stream: ms };
}
