import { AgentConfig } from "../../types";
import { injectTransferTools } from "../utils";
// Import Luna's instructions directly from the JSON file
import lunaInstructions from './luna-instructions.json';

// Import tools from consolidated index file
import { allTools, allToolImplementations, TaskList } from './tools';
// Extend the global namespace
declare global {
  var taskList: TaskList | undefined;
  var googleSearchRateLimit: {
    requestCount: number;
    windowStartTime: number;
    lastRequestTime: number;
  } | undefined;
}

// Create the personal assistant agent configuration
const personalAssistantConfig: AgentConfig = {
  name: "Luna",
  publicDescription: "Luna - Your Personal Assistant",
  instructions: lunaInstructions.instructions,
  tools: allTools,
  toolLogic: allToolImplementations
}; // Close personalAssistantConfig object


const personalAssistant = injectTransferTools([personalAssistantConfig]);
export default personalAssistant;

