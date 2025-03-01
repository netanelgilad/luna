import React from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { TokenContextProvider } from "@/app/contexts/TokenContext";
import App from "./App";

export default function Page() {
  return (
    <TokenContextProvider>
      <TranscriptProvider>
        <EventProvider>
          <App />
        </EventProvider>
      </TranscriptProvider>
    </TokenContextProvider>
  );
}
