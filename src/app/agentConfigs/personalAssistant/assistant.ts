import { AgentConfig, Tool } from "../../types";
import { injectTransferTools } from "../utils";

// Import Luna's instructions directly from the JSON file
import lunaInstructions from './luna-instructions.json';
// Define all the tools for the personal assistant
// Only implement configTools - other tools are removed
// Tools for reading and updating the agent's own configuration
const configTools: Tool[] = [
  {
    type: "function",
    name: "readAgentConfig",
    description: `
    Read the assistant's current instructions. 
    Always use this first before making any updates to understand the current configuration.
    `,
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    type: "function",
    name: "updateAgentConfig",
    description: `
    Update the assistant's instructions by applying a git-style diff to the current instructions. 
    IMPORTANT: 
      (1) First read current instructions with readAgentConfig
      (2) Create a git-style diff format with these components:
          - Hunk headers: @@ -start,count +start,count @@ (indicating line numbers)
          - Context lines (unchanged lines for context)
          - Lines to remove prefixed with '-'
          - Lines to add prefixed with '+'
      (3) Display the EXACT diff you want to apply to Netanel
      (4) Get EXPLICIT confirmation from Netanel before calling this function
      (5) Only call this function after receiving explicit approval from Netanel
      (6) The diff should be minimal and focused on the specific changes needed
      
    Example of a valid git-style diff:
    @@ -5,7 +5,8 @@
     Context line before
     Context line before
    -Line to remove
    +Line to add instead
    +Another line to add
     Context line after
     Context line after
    `,
    parameters: {
      type: "object",
      properties: {
        diff: {
          type: "string",
          description: "A git-style diff string describing changes to make to the instructions, with hunk headers (@@ -start,count +start,count @@), context lines, lines to remove (-), and lines to add (+)."
        }
      },
      required: ["diff"]
    }
  }
];

// Create the personal assistant agent configuration
const personalAssistantConfig: AgentConfig = {
  name: "Luna",
  publicDescription: "Luna - Your Personal Assistant",
  instructions: lunaInstructions.instructions,
  tools: [
    ...configTools
  ],
  toolLogic: {
    // Read the current instructions from the JSON file
    readAgentConfig: async () => {
      try {
        // Return the instructions directly 
        return {
          status: "success",
          data: lunaInstructions.instructions
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to read instructions: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },

    // Update the instructions by applying a diff and calling the API endpoint
    updateAgentConfig: async ({ diff }: { diff: string }) => {
      // Check if diff was provided
      if (!diff) {
        return {
          status: "error",
          message: "No diff provided. Please provide a diff describing the changes to make."
        };
      }
      
      try {
        // Read the current instructions
        const currentInstructions = lunaInstructions.instructions;
        
        // Parse the diff and apply it to the current instructions
        const applyDiff = (instructions: string, diffString: string): string => {
          // Split instructions into lines for processing
          const lines = instructions.split('\n');
          let result = [...lines];
          
          // Parse diff lines
          const diffLines = diffString.split('\n');
          
          // Process the diff line by line
          let currentHunk: { oldStart: number, oldCount: number, newStart: number, newCount: number } | null = null;
          let currentLine = 0;
          
          for (let i = 0; i < diffLines.length; i++) {
            const line = diffLines[i].trimEnd(); // Preserve leading whitespace but trim end
            
            // Parse hunk headers: @@ -oldStart,oldCount +newStart,newCount @@
            if (line.startsWith('@@') && line.includes('@@', 2)) {
              const hunkMatch = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
              if (hunkMatch) {
                currentHunk = {
                  oldStart: parseInt(hunkMatch[1], 10) - 1, // Convert to 0-based
                  oldCount: parseInt(hunkMatch[2], 10),
                  newStart: parseInt(hunkMatch[3], 10) - 1, // Convert to 0-based
                  newCount: parseInt(hunkMatch[4], 10)
                };
                currentLine = currentHunk.oldStart;
              }
              continue;
            }
            
            // Skip if no hunk is currently active
            if (!currentHunk) continue;
            
            // Process addition, removal, or context line
            if (line.startsWith('+')) {
              // This is a line to add
              const contentToAdd = line.substring(1); // Remove the '+' prefix
              // Insert at the current position
              result.splice(currentLine, 0, contentToAdd);
              currentLine++; // Move to next line
            } else if (line.startsWith('-')) {
              // This is a line to remove
              // Find the exact line to remove
              if (currentLine < result.length) {
                result.splice(currentLine, 1); // Remove the line
                // Don't increment currentLine as we've removed a line
              }
            } else if (!line.startsWith('@@')) {
              // This is a context line (unchanged)
              // Move to the next line
              currentLine++;
            }
          }
          
          return result.join('\n');
        };
        
        // Apply the diff to the current instructions
        const updatedInstructions = applyDiff(currentInstructions, diff);
        
        // Log for debugging
        console.log("Current instructions:", currentInstructions);
        console.log("Applied diff:", diff);
        console.log("Updated instructions:", updatedInstructions);
        
        // Call the API endpoint to update the instructions
        try {
          const response = await fetch('/api/update-luna-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instructions: updatedInstructions }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.status === "success") {
            return {
              status: "success",
              message: "Configuration updated successfully after receiving approval from Netanel.",
              data: {
                previousInstructions: currentInstructions,
                appliedDiff: diff,
                updatedInstructions: updatedInstructions
              }
            };
          } else {
            return {
              status: "error",
              message: `Server returned error: ${result.message || "Unknown error"}`
            };
          }
        } catch (fetchError) {
          return {
            status: "error",
            message: `Failed to update configuration: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
          };
        }
      } catch (error) {
        return {
          status: "error",
          message: `Error applying diff to instructions: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }
};

// Apply agent transfer tools
const personalAssistant = injectTransferTools([personalAssistantConfig]);

export default personalAssistant;

