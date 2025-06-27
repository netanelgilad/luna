import React from 'react';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  ChevronRight, 
  GitPullRequest, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Bot
} from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import type { Task, ChatMessage } from '../types';
import { clsx } from 'clsx';

interface TaskItemProps {
  task: Task;
  onToggleExpand: (taskId: string) => void;
  onSendMessage: (taskId: string, message: string) => void;
}

const statusConfig = {
  'pending': { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Pending' },
  'in-progress': { icon: AlertCircle, color: 'text-blue-600 bg-blue-50', label: 'In Progress' },
  'completed': { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Completed' },
  'failed': { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Failed' }
};

const prStatusConfig = {
  'open': { color: 'text-green-600 bg-green-50', label: 'Open' },
  'closed': { color: 'text-red-600 bg-red-50', label: 'Closed' },
  'merged': { color: 'text-purple-600 bg-purple-50', label: 'Merged' }
};

export function TaskItem({ task, onToggleExpand, onSendMessage }: TaskItemProps) {
  const StatusIcon = statusConfig[task.status].icon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Task Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand(task.id)}
      >
        <div className="flex items-start gap-4">
          <button className="mt-1">
            {task.isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
              <span className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium',
                statusConfig[task.status].color
              )}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig[task.status].label}
              </span>
            </div>

            <p className="text-gray-600 mb-3">{task.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* AI Assignee */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <Bot className="w-4 h-4" />
                <span>{task.aiAssignee}</span>
              </div>

              {/* Pull Request */}
              {task.pullRequest && (
                <a 
                  href={task.pullRequest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GitPullRequest className="w-4 h-4" />
                  <span>#{task.pullRequest.number}</span>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    prStatusConfig[task.pullRequest.status].color
                  )}>
                    {prStatusConfig[task.pullRequest.status].label}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {/* Updated Time */}
              <div className="text-gray-500">
                Updated {format(task.updatedAt, 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {task.isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Task Discussion</h4>
          <ChatInterface 
            messages={task.messages}
            onSendMessage={(message) => onSendMessage(task.id, message)}
          />
        </div>
      )}
    </div>
  );
}