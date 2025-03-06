"use client";

import React, { useRef, useEffect } from "react";

export interface WhiteboardProps {
  isExpanded: boolean;
}

// HTML content for the iframe - defined outside component to prevent re-creation
const iframeContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Whiteboard Execution Environment</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 10px; }
    canvas { border: 1px solid #ccc; }
    #output { margin-top: 10px; white-space: pre-wrap; }
    .error { color: red; }
  </style>
</head>
<body>
  <div id="content"></div>
  <div id="output"></div>
  <script>
    // Safer execution environment
    (function() {
      // Create a controlled execution context
      const whiteboard = {
        log: function(...args) {
          const output = document.getElementById('output');
          const logEntry = document.createElement('div');
          logEntry.textContent = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          output.appendChild(logEntry);
        },
        error: function(...args) {
          const output = document.getElementById('output');
          const errorEntry = document.createElement('div');
          errorEntry.className = 'error';
          errorEntry.textContent = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          output.appendChild(errorEntry);
        },
        clear: function() {
          document.getElementById('content').innerHTML = '';
          document.getElementById('output').innerHTML = '';
        }
      };

      // Message handler for code execution
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'executeCode') {
          try {
            const result = (function(code) {
              // Create container for return value
              let executionResult;
              // Execute in a function scope with whiteboard context
              try {
                // Function constructor provides better isolation than eval
                const executeFunction = new Function('whiteboard', 
                  'return (function() { ' + code + ' })();'
                );
                executionResult = executeFunction(whiteboard);
              } catch (error) {
                whiteboard.error('Execution error:', error.message);
                return { error: error.message };
              }
              
              // Return the result in a serializable form
              return {
                result: executionResult,
                success: true
              };
            })(event.data.code);
            
            // Post result back to parent
            window.parent.postMessage({
              type: 'executionResult',
              result: result
            }, '*');
          } catch (error) {
            // Post error back to parent
            window.parent.postMessage({
              type: 'executionResult',
              result: { error: error.message, success: false }
            }, '*');
          }
        }
      });
      
      // Let parent know we're ready
      window.parent.postMessage({ type: 'iframeReady' }, '*');
    })();
  </script>
</body>
</html>
`;

function Whiteboard({ isExpanded }: WhiteboardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef<boolean>(false);

  // Set up iframe once on mount instead of on each render
  useEffect(() => {
    if (!isExpanded) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Setup message listener to receive results from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'iframeReady') {
        iframeReadyRef.current = true;
      }
      // Additional message handlers can be added here
    };

    window.addEventListener('message', handleMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isExpanded]);

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
            <div className="mt-4">
              <iframe
                ref={iframeRef}
                id="whiteboard-iframe"
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-96 border border-gray-300 rounded"
                title="Whiteboard JavaScript Execution Environment"
                srcDoc={iframeContent}
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Whiteboard;

