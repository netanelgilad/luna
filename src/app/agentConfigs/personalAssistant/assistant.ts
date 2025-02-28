import { AgentConfig, Tool } from "../../types";
import { injectTransferTools } from "../utils";

// Import Luna's configuration directly - this works in browser environment
import lunaConfigData from './luna-config.json';

// Create a mutable copy of the config
let lunaConfig = { ...lunaConfigData };
// Define all the tools for the personal assistant
// Only implement configTools - other tools are removed

// Tools for reading and updating the agent's own configuration
const configTools: Tool[] = [
  {
    type: "function",
    name: "readAgentConfig",
    description: "Read the assistant's current configuration including personality, instructions, and preferences",
    parameters: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["all", "personality", "voice", "responsibilities", "response_style"],
          description: "Section of the configuration to read (defaults to 'all' if not specified)"
        }
      }
    }
  },
  {
    type: "function",
    name: "updateAgentConfig",
    description: "Update specific parts of the assistant's configuration",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Update the assistant's name"
        },
        publicDescription: {
          type: "string",
          description: "Update the public description of the assistant"
        },
        personalityTraits: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Update personality traits (e.g., 'friendly', 'professional', 'humorous')"
        },
        communicationStyle: {
          type: "string",
          description: "Update communication style (e.g., 'casual', 'formal', 'concise')"
        },
        voiceCharacteristics: {
          type: "object",
          properties: {
            pace: {
              type: "string",
              enum: ["slow", "moderate", "fast"],
              description: "Speaking pace"
            },
            tone: {
              type: "string",
              enum: ["neutral", "friendly", "professional"],
              description: "Voice tone"
            }
          },
          description: "Update voice characteristics for audio interactions"
        },
        responsePreferences: {
          type: "object",
          properties: {
            timeFormat: {
              type: "string",
              enum: ["12-hour", "24-hour"],
              description: "Preferred time format"
            },
            unitSystem: {
              type: "string",
              enum: ["metric", "imperial"],
              description: "Preferred unit system"
            },
            detailLevel: {
              type: "string",
              enum: ["concise", "detailed", "adaptive"],
              description: "Level of detail in responses"
            }
          },
          description: "Update preferences for response formatting"
        }
      }
    }
  }
];

// Create the personal assistant agent configuration
const personalAssistantConfig: AgentConfig = {
  name: lunaConfig.name,
  publicDescription: lunaConfig.publicDescription,
  instructions: lunaConfig.instructions,
  tools: [
    ...configTools
  ],
  toolLogic: {
    readAgentConfig: async ({ section = "all" }: { section?: "all" | "personality" | "voice" | "responsibilities" | "response_style" }) => {
      // Map the config sections to match the expected structure
      const config: Record<string, any> = {
        personality: lunaConfig.personality,
        voice: lunaConfig.voice,
        responsibilities: lunaConfig.responsibilities,
        response_style: lunaConfig.responsePref
      };

      // Return the requested section or all sections
      if (section === "all") {
        return {
          status: "success",
          data: config
        };
      } else if (Object.prototype.hasOwnProperty.call(config, section)) {
        return {
          status: "success",
          data: { [section]: config[section] }
        };
      } else {
        return {
          status: "error",
          message: `Section "${section}" not found. Available sections: all, personality, voice, responsibilities, response_style`
        };
      }
    },

    // Update specific parts of the agent's configuration by calling API endpoint
    updateAgentConfig: async (updates: {
      name?: string;
      publicDescription?: string;
      personalityTraits?: string[];
      communicationStyle?: string;
      voiceCharacteristics?: {
        pace?: "slow" | "moderate" | "fast";
        tone?: "neutral" | "friendly" | "professional";
      };
      responsePreferences?: {
        timeFormat?: "12-hour" | "24-hour";
        unitSystem?: "metric" | "imperial";
        detailLevel?: "concise" | "detailed" | "adaptive";
      };
    }) => {
      // Check if any updates were provided
      if (!updates || Object.keys(updates).length === 0) {
        return {
          status: "error",
          message: "No valid update fields provided. Please specify at least one field to update."
        };
      }
      
      // Call the API endpoint to update the configuration
      try {
        const response = await fetch('/api/update-luna-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update the local copy of the config with the changes
        if (result.status === "success" && result.updatedFields) {
          // Update our local copy of the config with the changes to keep it in sync
          if (updates.name) {
            lunaConfig.name = updates.name;
          }
          
          if (updates.publicDescription) {
            lunaConfig.publicDescription = updates.publicDescription;
          }
          
          if (updates.personalityTraits) {
            lunaConfig.personality.traits = updates.personalityTraits;
          }
          
          if (updates.communicationStyle) {
            lunaConfig.personality.communicationStyle = updates.communicationStyle;
          }
          
          if (updates.voiceCharacteristics) {
            if (updates.voiceCharacteristics.pace) {
              lunaConfig.voice.speakingPace = updates.voiceCharacteristics.pace;
            }
            
            if (updates.voiceCharacteristics.tone) {
              lunaConfig.voice.tone = updates.voiceCharacteristics.tone;
            }
          }
          
          if (updates.responsePreferences) {
            if (updates.responsePreferences.timeFormat) {
              lunaConfig.responsePref.timeFormat = updates.responsePreferences.timeFormat;
            }
            
            if (updates.responsePreferences.unitSystem) {
              lunaConfig.responsePref.unitSystem = updates.responsePreferences.unitSystem;
            }
            
            if (updates.responsePreferences.detailLevel) {
              lunaConfig.responsePref.adaptDetailLevel = updates.responsePreferences.detailLevel === "adaptive";
            }
          }
        }
        
        return result;
      } catch (error) {
        return {
          status: "error",
          message: `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }
};

// Apply agent transfer tools
const personalAssistant = injectTransferTools([personalAssistantConfig]);

export default personalAssistant;

