import { AgentConfig } from "@/app/types";

/**
 * This function previously added "transferAgents" tool dynamically based on downstream agents.
 * Now that we only have one agent (Luna), it's simplified to just handle downstream agent references.
 */
export function injectTransferTools(agentDefs: AgentConfig[]): AgentConfig[] {
  // Iterate over each agent definition
  agentDefs.forEach((agentDef) => {
    // Simplified function - no transfer tools needed with only one agent
    // Initialize tools array if needed for compatibility
    if (!agentDef.tools) {
      agentDef.tools = [];
    }

    // so .stringify doesn't break with circular dependencies
    agentDef.downstreamAgents = agentDef.downstreamAgents?.map(
      ({ name, publicDescription }) => ({
        name,
        publicDescription,
      })
    );
  });

  return agentDefs;
}
