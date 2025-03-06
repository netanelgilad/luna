import { Tool } from "../../../types";
import axios from 'axios';
import { AxiosError } from 'axios';
import { Task } from "./taskTools";

// Extend the global namespace for rate limiting
declare global {
  var googleSearchRateLimit: {
    requestCount: number;
    windowStartTime: number;
    lastRequestTime: number;
  } | undefined;
}

// Google Search tool
export const searchTools: Tool[] = [
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

// Google Search implementation
export const searchToolsLogic = {
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
};

/**
 * Creates a task to remind users to enable Google search functionality
 * by adding their API keys to the .env.local file
 */
export const createGoogleSearchReminder = async () => {
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

