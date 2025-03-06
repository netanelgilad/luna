import { Tool } from "../../../types";

// Define Task types
export interface Task {
  id: number;
  task: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

export interface TaskList {
  name: string;
  tasks: Task[];
  nextId: number;
}

// Extend the global namespace
declare global {
  var taskList: TaskList | undefined;
}

// Task management tools
export const taskTools: Tool[] = [
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

// Task management tool implementations
export const taskToolsImplementation = {
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
  }
};

/**
 * Helper function to create a task reminder
 * @param taskDescription Description of the task to create
 * @param priority Priority level ('high', 'medium', 'low')
 * @returns The created task or null if creation failed
 */
export const createTaskReminder = async (taskDescription: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<Task | null> => {
  try {
    // Initialize task list if it doesn't exist
    if (!global.taskList) {
      global.taskList = {
        name: "Tasks",
        tasks: [],
        nextId: 1
      };
    }
    
    // Check if reminder already exists to avoid duplicates
    const reminderExists = global.taskList.tasks.some((task: Task) => 
      task.task.includes(taskDescription)
    );
    
    if (!reminderExists) {
      // Create the reminder task
      const reminderTask: Task = {
        id: global.taskList.nextId++,
        task: taskDescription,
        priority,
        dueDate: null,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      // Add to task list
      global.taskList.tasks.push(reminderTask);
      return reminderTask;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to create task reminder:", error);
    return null;
  }
};

