"use client";

import React from "react";

export interface WhiteboardProps {
  isExpanded: boolean;
}

function Whiteboard({ isExpanded }: WhiteboardProps) {
  return (
    <div
      className={
        (isExpanded ? "flex-1 overflow-auto" : "h-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white"
      }
    >
      {isExpanded && (
        <div>
          <div className="font-semibold px-6 py-4 sticky top-0 z-10 text-base border-b bg-white">
            Whiteboard
          </div>
          <div className="p-6">
            <p className="text-gray-800">This is Luna's Whiteboard</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Whiteboard;

