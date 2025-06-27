export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  status: 'open' | 'closed' | 'merged';
  createdAt: Date;
  author: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  pullRequest?: PullRequest;
  aiAssignee: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  isExpanded?: boolean;
}