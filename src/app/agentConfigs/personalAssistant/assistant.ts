import { AgentConfig, Tool } from "../../types";
import { injectTransferTools } from "../utils";
// Import Luna's instructions directly from the JSON file
import lunaInstructions from './luna-instructions.json';
import axios from 'axios';
import { AxiosError } from 'axios';

// Define Task types
interface Task {
  id: number;
  task: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

interface TaskList {
  name: string;
  tasks: Task[];
  nextId: number;
}

// Extend the global namespace
declare global {
  var taskList: TaskList | undefined;
  var googleSearchRateLimit: {
    requestCount: number;
    windowStartTime: number;
    lastRequestTime: number;
  } | undefined;
}

// Define all the tools for the personal assistant
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

// Task management tools
const taskTools: Tool[] = [
  {
    type: "function",
    name: "createTaskList",
    description: "Create a new task list or clear the existing one. Use this to initialize a task list in memory.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Optional name for the task list"
        }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "addTask",
    description: "Add a new task to the task list.",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task description"
        },
        priority: {
          type: "string",
          description: "Optional priority level (high, medium, low)"
        },
        dueDate: {
          type: "string",
          description: "Optional due date for the task (YYYY-MM-DD format or natural language)"
        }
      },
      required: ["task"]
    }
  },
  {
    type: "function",
    name: "listTasks",
    description: "List all tasks in the current task list.",
    parameters: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter: 'all', 'completed', or 'pending'"
        },
        sortBy: {
          type: "string",
          description: "Optional sort criteria: 'priority', 'dueDate', 'added'"
        }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "completeTask",
    description: "Mark a task as complete.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "number",
          description: "The ID of the task to mark as complete"
        }
      },
      required: ["taskId"]
    }
  },
  {
    type: "function",
    name: "deleteTask",
    description: "Delete a task from the task list.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "number",
          description: "The ID of the task to delete"
        }
      },
      required: ["taskId"]
    }
  },
  {
    type: "function",
    name: "updateTask",
    description: "Update an existing task's details.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "number",
          description: "The ID of the task to update"
        },
        task: {
          type: "string",
          description: "The new task description"
        },
        priority: {
          type: "string",
          description: "The new priority level (high, medium, low)"
        },
        dueDate: {
          type: "string",
          description: "The new due date (YYYY-MM-DD format or natural language)"
        }
      },
      required: ["taskId"]
    }
  }
];

// Google Search tool
const searchTools: Tool[] = [
  {
    type: "function",
    name: "googleSearch",
    description: `
    Search the web using Google Search API and return relevant results.
    Use this to find up-to-date information from the internet when you need to answer factual questions.
    `,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to send to Google"
        },
        numResults: {
          type: "number",
          description: "Optional: Number of results to return (default: 5, max: 10)"
        }
      },
      required: ["query"]
    }
  }
];

// Create the personal assistant agent configuration
const personalAssistantConfig: AgentConfig = {
  name: "Luna",
  publicDescription: "Luna - Your Personal Assistant",
  instructions: lunaInstructions.instructions,
  tools: [
    ...configTools,
    ...taskTools,
    ...searchTools
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
    },
    
    // Task management tool implementations
    createTaskList: async ({ name }: { name?: string }) => {
      try {
        // Initialize or clear the global task list
        if (!global.taskList) {
          global.taskList = {
            name: name || "Tasks",
            tasks: [],
            nextId: 1
          };
        } else {
          global.taskList = {
            name: name || "Tasks",
            tasks: [],
            nextId: 1
          };
        }

        return {
          status: "success",
          message: `Task list "${global.taskList.name}" created successfully.`,
          data: { name: global.taskList.name }
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to create task list: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },
    
    addTask: async ({ task, priority, dueDate }: { task: string, priority?: string, dueDate?: string }) => {
      try {
        // Initialize task list if it doesn't exist
        if (!global.taskList) {
          global.taskList = {
            name: "Tasks",
            tasks: [],
            nextId: 1
          };
        }
        
        // Create new task
        const newTask: Task = {
          id: global.taskList.nextId++,
          task,
          priority: (priority as 'high' | 'medium' | 'low') || "medium",
          dueDate: dueDate || null,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        // Add to list
        global.taskList.tasks.push(newTask);
        
        return {
          status: "success",
          message: `Task added successfully with ID ${newTask.id}.`,
          data: newTask
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to add task: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },
    
    listTasks: async ({ filter, sortBy }: { filter?: string, sortBy?: string }) => {
      try {
        // Initialize task list if it doesn't exist
        if (!global.taskList) {
          global.taskList = {
            name: "Tasks",
            tasks: [],
            nextId: 1
          };
        }
        
        // Filter tasks
        let filteredTasks = [...global.taskList.tasks];
        if (filter === "completed") {
          filteredTasks = filteredTasks.filter((t: Task) => t.completed);
        } else if (filter === "pending") {
          filteredTasks = filteredTasks.filter((t: Task) => !t.completed);
        }
        
        // Sort tasks
        if (sortBy === "priority") {
          const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
          filteredTasks.sort((a: Task, b: Task) => 
            (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999)
          );
        } else if (sortBy === "dueDate") {
          filteredTasks.sort((a: Task, b: Task) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });
        } else if (sortBy === "added") {
          filteredTasks.sort((a: Task, b: Task) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        
        return {
          status: "success",
          data: {
            listName: global.taskList.name,
            tasks: filteredTasks,
            totalTasks: global.taskList.tasks.length,
            completedTasks: global.taskList.tasks.filter((t: Task) => t.completed).length,
            pendingTasks: global.taskList.tasks.filter((t: Task) => !t.completed).length
          }
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },
    
    completeTask: async ({ taskId }: { taskId: number }) => {
      try {
        // Check if task list exists
        if (!global.taskList) {
          return {
            status: "error",
            message: "No task list exists. Create one first with createTaskList."
          };
        }
        
        // Find and update the task
        const taskIndex = global.taskList.tasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex === -1) {
          return {
            status: "error",
            message: `Task with ID ${taskId} not found.`
          };
        }
        
        global.taskList.tasks[taskIndex].completed = true;
        
        return {
          status: "success",
          message: `Task ${taskId} marked as complete.`,
          data: global.taskList.tasks[taskIndex]
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to complete task: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },
    
    deleteTask: async ({ taskId }: { taskId: number }) => {
      try {
        // Check if task list exists
        if (!global.taskList) {
          return {
            status: "error",
            message: "No task list exists. Create one first with createTaskList."
          };
        }
        
        // Find the task
        const taskIndex = global.taskList.tasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex === -1) {
          return {
            status: "error",
            message: `Task with ID ${taskId} not found.`
          };
        }
        
        // Remove the task
        const deletedTask = global.taskList.tasks.splice(taskIndex, 1)[0];
        
        return {
          status: "success",
          message: `Task ${taskId} deleted successfully.`,
          data: deletedTask
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },
    
    updateTask: async ({ taskId, task, priority, dueDate }: { taskId: number, task?: string, priority?: string, dueDate?: string }) => {
      try {
        // Check if task list exists
        if (!global.taskList) {
          return {
            status: "error",
            message: "No task list exists. Create one first with createTaskList."
          };
        }
        
        // Find the task
        const taskIndex = global.taskList.tasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex === -1) {
          return {
            status: "error",
            message: `Task with ID ${taskId} not found.`
          };
        }
        
        // Update the task
        if (task !== undefined) {
          global.taskList.tasks[taskIndex].task = task;
        }
        if (priority !== undefined) {
          global.taskList.tasks[taskIndex].priority = priority as 'high' | 'medium' | 'low';
        }
        if (dueDate !== undefined) {
          global.taskList.tasks[taskIndex].dueDate = dueDate;
        }
        
        return {
          status: "success",
          message: `Task ${taskId} updated successfully.`,
          data: global.taskList.tasks[taskIndex]
        };
      } catch (error) {
        return {
          status: "error",
          message: `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    },

    // Google Search implementation
    googleSearch: async ({ query, numResults = 5 }: { query: string, numResults?: number }) => {
      // Initialize rate limiting if not already set
      if (!global.googleSearchRateLimit) {
        global.googleSearchRateLimit = {
          requestCount: 0,
          windowStartTime: Date.now(),
          lastRequestTime: 0
        };
      }

      // Rate limiting configuration
      const MAX_REQUESTS_PER_MINUTE = 10;
      const TIME_WINDOW_MS = 60 * 1000; // 1 minute
      const MIN_REQUEST_SPACING_MS = 1000; // 1 second minimum between requests

      try {
        // Validate input
        if (!query.trim()) {
          return {
            status: "error",
            message: "Search query cannot be empty."
          };
        }

        // Limit the number of results
        const limit = Math.min(Math.max(1, numResults), 10); // Ensure between 1 and 10

        // Get API key and search engine ID from environment variables
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        const searchEngineId = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID;

        // Check if API key and search engine ID are available
        if (!apiKey || !searchEngineId) {
          return {
            status: "error",
            message: "Google Search API key or Search Engine ID not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID to your environment variables."
          };
        }
        
        // Rate limiting checks
        const now = Date.now();
        const timeSinceWindowStart = now - global.googleSearchRateLimit.windowStartTime;
        const timeSinceLastRequest = now - global.googleSearchRateLimit.lastRequestTime;
        
        // Reset the window if it's been more than a minute
        if (timeSinceWindowStart > TIME_WINDOW_MS) {
          global.googleSearchRateLimit.requestCount = 0;
          global.googleSearchRateLimit.windowStartTime = now;
        }
        
        // Check if we've exceeded the rate limit
        if (global.googleSearchRateLimit.requestCount >= MAX_REQUESTS_PER_MINUTE) {
          const waitTime = TIME_WINDOW_MS - timeSinceWindowStart;
          console.warn(`Rate limit exceeded: ${global.googleSearchRateLimit.requestCount} requests in the last minute. Need to wait ${waitTime}ms.`);
          return {
            status: "error",
            message: `Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`
          };
        }
        
        // Enforce minimum spacing between requests
        if (timeSinceLastRequest < MIN_REQUEST_SPACING_MS) {
          console.warn(`Requests too frequent. Last request was ${timeSinceLastRequest}ms ago. Minimum spacing is ${MIN_REQUEST_SPACING_MS}ms.`);
          return {
            status: "error",
            message: `Requests too frequent. Please try again in ${Math.ceil((MIN_REQUEST_SPACING_MS - timeSinceLastRequest) / 1000)} seconds.`
          };
        }
        
        // Update rate limiting state
        global.googleSearchRateLimit.requestCount++;
        global.googleSearchRateLimit.lastRequestTime = now;

        // Construct the Google Custom Search API URL
        const url = 'https://www.googleapis.com/customsearch/v1';
        
        // Log the search request
        console.log(`Performing Google search for: "${query}" (${global.googleSearchRateLimit.requestCount}/${MAX_REQUESTS_PER_MINUTE} requests in current window)`);
        
        // Make the request to Google Search API
        const response = await axios.get(url, {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: query,
            num: limit
          }
        });

        // Process and format the search results
        if (response.data && response.data.items) {
          const formattedResults = response.data.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink
          }));

          return {
            status: "success",
            data: {
              query,
              totalResults: response.data.searchInformation?.totalResults || 0,
              searchTime: response.data.searchInformation?.searchTime || 0,
              results: formattedResults
            }
          };
        } else {
          return {
            status: "success",
            data: {
              query,
              totalResults: 0,
              results: []
            },
            message: "No results found for the query."
          };
        }
      } catch (error) {
        // Handle API errors and provide helpful error message
        console.error("Google Search API error:", error);
        
        let errorMessage = "Failed to perform search";
        let errorCode = "UNKNOWN_ERROR";
        let retryable = false;
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          if (axiosError.response) {
            const status = axiosError.response.status;
            // The request was made and the server responded with a status code
            errorMessage = `Search API error: ${status} - ${(axiosError.response.data as any)?.error?.message || JSON.stringify(axiosError.response.data)}`;
            
            // Set appropriate error code based on status
            if (status === 403) {
              errorCode = "API_KEY_ERROR";
              errorMessage = "Search API access denied. Please check your API key or quota limits.";
            } else if (status === 429) {
              errorCode = "RATE_LIMIT_EXCEEDED";
              errorMessage = "Search API rate limit exceeded. Please try again later.";
              retryable = true;
            } else if (status >= 500) {
              errorCode = "SERVER_ERROR";
              errorMessage = "Search API server error. Please try again later.";
              retryable = true;
            } else {
              errorCode = `HTTP_${status}`;
            }
            
            // Log details for debugging
            console.error(`Google Search API ${errorCode}: ${status} - ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            // The request was made but no response was received
            errorCode = "NETWORK_ERROR";
            errorMessage = "No response received from search API. Please check your network connection.";
            retryable = true;
            console.error("Google Search API network error:", axiosError.request);
          } else {
            // Something happened in setting up the request
            errorCode = "REQUEST_SETUP_ERROR";
            errorMessage = `Error setting up search request: ${axiosError.message}`;
            console.error("Google Search request setup error:", axiosError.message);
          }
        } else if (error instanceof Error) {
          errorCode = "RUNTIME_ERROR";
          errorMessage = `Search error: ${error.message}`;
          console.error("Google Search runtime error:", error);
        }
        
        // Reset rate limit count if there was a critical error
        if (errorCode === "API_KEY_ERROR") {
          // Reset the rate limit window on authentication errors
          if (global.googleSearchRateLimit) {
            global.googleSearchRateLimit.requestCount = 0;
          }
        }
        
        return {
          status: "error",
          message: errorMessage,
          data: {
            errorCode,
            retryable,
            query
          }
        };
      } finally {
        // Log current rate limit status
        if (global.googleSearchRateLimit) {
          const remainingRequests = MAX_REQUESTS_PER_MINUTE - global.googleSearchRateLimit.requestCount;
          const windowResetIn = TIME_WINDOW_MS - (Date.now() - global.googleSearchRateLimit.windowStartTime);
          
          if (remainingRequests <= 3) {
            console.warn(`Google Search API rate limit warning: ${remainingRequests} requests remaining in current window. Window resets in ${Math.ceil(windowResetIn/1000)}s`);
          }
        }
      }
    }
  }
}; // Close personalAssistantConfig object

/**
 * Creates a task to remind users to enable Google search functionality
 * by adding their API keys to the .env.local file
 */
const createGoogleSearchReminder = async () => {
  try {
    // Check if Google API keys are configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const searchEngineId = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID;
    
    // Only create reminder if keys are missing
    if (!apiKey || !searchEngineId) {
      console.log("Google Search API keys not found. Creating reminder task...");
      
      // Initialize task list if it doesn't exist
      if (!global.taskList) {
        global.taskList = {
          name: "System Tasks",
          tasks: [],
          nextId: 1
        };
      }
      
      // Check if reminder already exists to avoid duplicates
      const reminderExists = global.taskList.tasks.some((task: Task) => 
        task.task.includes("Enable Google Search") || 
        task.task.includes("NEXT_PUBLIC_GOOGLE_API_KEY")
      );
      
      if (!reminderExists) {
        // Create the reminder task
        const reminderTask: Task = {
          id: global.taskList.nextId++,
          task: "Enable Google Search functionality by adding NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID to your .env.local file",
          priority: "high",
          dueDate: null,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        // Add to task list
        global.taskList.tasks.push(reminderTask);
        console.log(`Created Google Search reminder task with ID ${reminderTask.id}`);
      }
    }
  } catch (error) {
    console.error("Failed to create Google Search reminder:", error);
  }
};

// Create Google search reminder when module is loaded
createGoogleSearchReminder();

const personalAssistant = injectTransferTools([personalAssistantConfig]);
export default personalAssistant;

