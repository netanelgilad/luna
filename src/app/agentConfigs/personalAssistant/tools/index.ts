// Export all tool definitions
export { configTools } from './configTools';
export { taskTools, createTaskReminder } from './taskTools';
export type { Task, TaskList } from './taskTools';
export { searchTools, createGoogleSearchReminder } from './searchTools';
export { javascriptTools } from './javascriptTools';

// Export all tool implementations
export { configToolsLogic } from './configTools';
export { taskToolsImplementation } from './taskTools';
export { searchToolsLogic } from './searchTools';
export { javascriptToolsLogic } from './javascriptTools';

// Export a combined tools array for convenience
import { configTools } from './configTools';
import { taskTools } from './taskTools';
import { searchTools } from './searchTools';
import { javascriptTools } from './javascriptTools';

export const allTools = [
  ...configTools,
  ...taskTools,
  ...searchTools,
  ...javascriptTools
];

// Export a combined toolLogic object for convenience
import { configToolsLogic } from './configTools';
import { taskToolsImplementation } from './taskTools';
import { searchToolsLogic } from './searchTools';
import { javascriptToolsLogic } from './javascriptTools';

export const allToolImplementations = {
  ...configToolsLogic,
  ...taskToolsImplementation,
  ...searchToolsLogic,
  ...javascriptToolsLogic
};

