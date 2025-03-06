import { Tool } from "../../../types";

// Define the javascriptTools array
export const javascriptTools: Tool[] = [
  {
    type: "function",
    name: "executeJavascript",
    description: `
    Execute JavaScript code in the whiteboard iframe and get serialized results back.
    This allows you to manipulate the DOM, create visualizations, or perform calculations
    within the isolated environment of the whiteboard.
    
    The code will be executed in a sandboxed iframe environment, and the return value
    will be serialized using JSON.stringify where possible. If the result can't be
    serialized directly (like DOM nodes), a string representation will be returned.
    
    IMPORTANT:
    - The code must be valid JavaScript that can execute in a browser environment
    - For DOM manipulation, target elements within the iframe's document
    - Use 'return' to specify what value should be sent back
    - Complex objects may not serialize correctly - prefer returning primitive values or plain objects
    - Any errors during execution will be caught and returned as error messages
    `,
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript code to execute in the whiteboard iframe"
        }
      },
      required: ["code"]
    }
  }
];

// Implementation logic for javascript tools
export const javascriptToolsLogic = {
  // Execute JavaScript code in the whiteboard iframe and return the result
  executeJavascript: async ({ code }: { code: string }) => {
    try {
      if (!code) {
        return {
          status: "error",
          message: "No JavaScript code provided. Please provide code to execute."
        };
      }
      
      // Find the whiteboard iframe element
      const getWhiteboardIframe = () => {
        // Find the iframe in the whiteboard component
        const iframes = document.querySelectorAll('iframe');
        const whiteboardIframe = Array.from(iframes).find(iframe => {
          try {
            // Check if this is the whiteboard iframe
            return iframe.id === 'whiteboard-iframe' || 
                   iframe.classList.contains('whiteboard-iframe') ||
                   iframe.parentElement?.classList.contains('whiteboard');
          } catch (e) {
            return false;
          }
        });
        
        if (!whiteboardIframe) {
          throw new Error("Whiteboard iframe not found. Make sure the whiteboard is open and visible.");
        }
        
        return whiteboardIframe;
      };
      
      // Execute code in iframe using message-based communication
      const executeCodeInIframe = (iframe: HTMLIFrameElement, code: string) => {
        return new Promise((resolve, reject) => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (!iframeWindow) {
              throw new Error("Cannot access iframe content window");
            }
            
            // Generate a unique message ID for this execution request
            const messageId = `js_execution_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // Set up timeout to prevent hanging
            const timeoutId = setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              reject(new Error("JavaScript execution timed out after 5000ms"));
            }, 5000);
            
            // Setup message handler to receive results
            const messageHandler = (event: MessageEvent) => {
              // Only accept messages from our iframe
              if (event.source !== iframeWindow) return;
              
              try {
                const data = event.data;
                
                // Check if this is a response to our specific execution request
                if (data && data.type === 'javascript_execution_result' && data.messageId === messageId) {
                  // Clean up
                  window.removeEventListener('message', messageHandler);
                  clearTimeout(timeoutId);
                  
                  // Process the result
                  if (data.error) {
                    resolve({
                      status: "error",
                      message: data.error
                    });
                  } else {
                    resolve({
                      status: "success",
                      data: data.result
                    });
                  }
                }
              } catch (processError) {
                // Clean up in case of error
                window.removeEventListener('message', messageHandler);
                clearTimeout(timeoutId);
                reject(processError);
              }
            };
            
            // Register the message handler
            window.addEventListener('message', messageHandler);
            
            // Ensure the iframe has our execution handler script
            const ensureExecutionHandler = () => {
              try {
                // Check if the execution handler is already initialized
                const isInitialized = iframeWindow.document.getElementById('js-execution-handler');
                
                if (!isInitialized) {
                  // Create and inject the execution handler script if it doesn't exist yet
                  const script = iframeWindow.document.createElement('script');
                  script.id = 'js-execution-handler';
                  script.textContent = `
                    window.executeJavaScript = function(code, messageId) {
                      try {
                        // Execute the code in a safe wrapper
                        const result = (function() {
                          try {
                            return (function() {
                              ${code}
                            })();
                          } catch (error) {
                            throw error;
                          }
                        })();
                        
                        // Try to serialize the result
                        try {
                          // Notify the parent window of the successful result
                          window.parent.postMessage({
                            type: 'javascript_execution_result',
                            messageId: messageId,
                            result: result
                          }, '*');
                        } catch (serializeError) {
                          // If serialization fails (via structured clone algorithm), return a string
                          window.parent.postMessage({
                            type: 'javascript_execution_result',
                            messageId: messageId,
                            result: \`[Unserializable result: \${String(result)}]\`
                          }, '*');
                        }
                      } catch (error) {
                        // Notify the parent window of the error
                        window.parent.postMessage({
                          type: 'javascript_execution_result',
                          messageId: messageId,
                          error: error instanceof Error ? error.message : String(error)
                        }, '*');
                      }
                    };
                    
                    // Setup listener for execution requests
                    window.addEventListener('message', function(event) {
                      if (event.source === window.parent && 
                          event.data && 
                          event.data.type === 'execute_javascript') {
                        window.executeJavaScript(event.data.code, event.data.messageId);
                      }
                    });
                    
                    // Signal that the execution handler is ready
                    window.parent.postMessage({ type: 'js_execution_handler_ready' }, '*');
                  `;
                  iframeWindow.document.head.appendChild(script);
                  
                  // Wait for confirmation that the handler is ready
                  return new Promise<void>((resolveSetup) => {
                    const setupTimeoutId = setTimeout(() => {
                      window.removeEventListener('message', setupHandler);
                      // Continue anyway after timeout
                      resolveSetup();
                    }, 1000);
                    
                    const setupHandler = (event: MessageEvent) => {
                      if (event.source === iframeWindow && 
                          event.data && 
                          event.data.type === 'js_execution_handler_ready') {
                        clearTimeout(setupTimeoutId);
                        window.removeEventListener('message', setupHandler);
                        resolveSetup();
                      }
                    };
                    
                    window.addEventListener('message', setupHandler);
                  });
                }
                
                return Promise.resolve();
              } catch (setupError) {
                return Promise.reject(setupError);
              }
            };
            
            // Setup the execution environment and send the code to execute
            ensureExecutionHandler()
              .then(() => {
                // Send the code to the iframe for execution
                iframeWindow.postMessage({
                  type: 'execute_javascript',
                  code: code,
                  messageId: messageId
                }, '*');
              })
              .catch(setupError => {
                window.removeEventListener('message', messageHandler);
                clearTimeout(timeoutId);
                reject(new Error(`Failed to setup execution environment: ${setupError.message}`));
              });
            
          } catch (error) {
            reject(error);
          }
        });
      };
      
      // Main execution flow
      try {
        const iframe = getWhiteboardIframe();
        const result = await executeCodeInIframe(iframe, code);
        return result;
      } catch (executionError) {
        return {
          status: "error",
          message: `Failed to execute JavaScript: ${executionError instanceof Error ? executionError.message : String(executionError)}`
        };
      }
    } catch (error) {
      return {
        status: "error",
        message: `Error in executeJavascript tool: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

