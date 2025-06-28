import type { Task } from '../types';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement user authentication system',
    description: 'Add JWT-based authentication with login, logout, and session management',
    status: 'in-progress',
    pullRequest: {
      id: 'pr-1',
      number: 42,
      title: 'feat: Add JWT authentication system',
      url: 'https://github.com/org/repo/pull/42',
      status: 'open',
      createdAt: new Date('2024-01-15T10:00:00'),
      author: 'AIAssistant'
    },
    aiAssignee: 'Claude-3',
    createdAt: new Date('2024-01-14T09:00:00'),
    updatedAt: new Date('2024-01-15T14:30:00'),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'We need to implement JWT authentication for our API endpoints',
        timestamp: new Date('2024-01-14T09:00:00')
      },
      {
        id: 'm2',
        role: 'ai',
        content: 'I understand. I\'ll implement a JWT-based authentication system. This will include:\n\n1. User login endpoint\n2. Token generation and validation\n3. Middleware for protected routes\n4. Refresh token mechanism\n\nI\'ve created a pull request with the initial implementation.',
        timestamp: new Date('2024-01-14T09:05:00')
      },
      {
        id: 'm3',
        role: 'user',
        content: 'Can you also add password reset functionality?',
        timestamp: new Date('2024-01-15T14:00:00')
      },
      {
        id: 'm4',
        role: 'ai',
        content: 'Absolutely! I\'ll add password reset functionality with email verification. I\'ll update the PR with:\n\n- Password reset request endpoint\n- Email token generation\n- Password update endpoint\n- Email service integration\n\nThis should be ready in about 30 minutes.',
        timestamp: new Date('2024-01-15T14:05:00')
      }
    ]
  },
  {
    id: '2',
    title: 'Optimize database queries for dashboard',
    description: 'Improve performance of dashboard analytics queries',
    status: 'completed',
    pullRequest: {
      id: 'pr-2',
      number: 38,
      title: 'perf: Optimize dashboard queries with indexes',
      url: 'https://github.com/org/repo/pull/38',
      status: 'merged',
      createdAt: new Date('2024-01-10T11:00:00'),
      author: 'AIAssistant'
    },
    aiAssignee: 'GPT-4',
    createdAt: new Date('2024-01-10T08:00:00'),
    updatedAt: new Date('2024-01-12T16:00:00'),
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'The dashboard is loading slowly. Can you investigate and optimize the queries?',
        timestamp: new Date('2024-01-10T08:00:00')
      },
      {
        id: 'm6',
        role: 'ai',
        content: 'I\'ve analyzed the dashboard queries and found several optimization opportunities:\n\n1. Missing indexes on frequently queried columns\n2. N+1 query problems in the analytics endpoints\n3. Unnecessary data fetching in some aggregations\n\nI\'ve created a PR with the optimizations. Expected performance improvement: 70-80%.',
        timestamp: new Date('2024-01-10T11:30:00')
      }
    ]
  },
  {
    id: '3',
    title: 'Create automated test suite for API',
    description: 'Develop comprehensive test coverage for all API endpoints',
    status: 'pending',
    aiAssignee: 'Claude-3',
    createdAt: new Date('2024-01-16T10:00:00'),
    updatedAt: new Date('2024-01-16T10:00:00'),
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'We need to create a comprehensive test suite for our API endpoints. Can you help with this?',
        timestamp: new Date('2024-01-16T10:00:00')
      },
      {
        id: 'm8',
        role: 'ai',
        content: 'I\'ll create a comprehensive test suite for your API. This will include:\n\n1. Unit tests for all service methods\n2. Integration tests for API endpoints\n3. Mock data factories\n4. Test coverage reporting\n5. CI/CD integration\n\nLet me start by analyzing your current API structure to create an effective testing strategy.',
        timestamp: new Date('2024-01-16T10:05:00')
      }
    ]
  },
  {
    id: '4',
    title: 'Implement real-time notifications',
    description: 'Add WebSocket-based real-time notifications system',
    status: 'in-progress',
    pullRequest: {
      id: 'pr-4',
      number: 45,
      title: 'feat: Add WebSocket notification system',
      url: 'https://github.com/org/repo/pull/45',
      status: 'open',
      createdAt: new Date('2024-01-16T14:00:00'),
      author: 'AIAssistant'
    },
    aiAssignee: 'GPT-4',
    createdAt: new Date('2024-01-15T09:00:00'),
    updatedAt: new Date('2024-01-16T15:00:00'),
    messages: [
      {
        id: 'm9',
        role: 'user',
        content: 'We need real-time notifications for user actions. Can you implement a WebSocket solution?',
        timestamp: new Date('2024-01-15T09:00:00')
      },
      {
        id: 'm10',
        role: 'ai',
        content: 'I\'ll implement a WebSocket-based notification system using Socket.io. The implementation will include:\n\n1. WebSocket server setup\n2. Client-side connection management\n3. Event-based notification system\n4. Room-based broadcasting for user-specific notifications\n5. Reconnection logic and error handling\n\nI\'ve started working on the PR.',
        timestamp: new Date('2024-01-15T09:10:00')
      }
    ]
  }
];