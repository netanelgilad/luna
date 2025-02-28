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
    description: "Read the assistant's current instructions",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    type: "function",
    name: "updateAgentConfig",
    description: "Update the assistant's instructions",
    parameters: {
      type: "object",
      properties: {
        instructions: {
          type: "string",
          description: "The new instructions for the assistant"
        }
      },
      required: ["instructions"]
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

    // Update the instructions by calling API endpoint
    updateAgentConfig: async ({ instructions: newInstructions }: { instructions: string }) => {
      // Check if instructions were provided
      if (!newInstructions) {
        return {
          status: "error",
          message: "No instructions provided. Please provide the new instructions."
        };
      }
      
      // Call the API endpoint to update the instructions
      try {
        const response = await fetch('/api/update-luna-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ instructions: newInstructions }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update the local copy of the config with the changes
        // We don't need to update a local copy anymore as we'll get fresh data on reload
        if (result.status === "success") {
          // Success handling can be done here if needed
        }
        
        return result;
      } catch (error) {
        return {
          status: "error",
          message: `Failed to update instructions: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }
};

// Apply agent transfer tools
const personalAssistant = injectTransferTools([personalAssistantConfig]);

export default personalAssistant;

