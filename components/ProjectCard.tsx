import React, { useMemo } from 'react';
import { Project, Task, TaskStatus, TaskPriority } from '../types';
import { TargetIcon } from './icons';

interface ProjectCardProps {
  project: Project;
  goalTitle: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const statusOrder: TaskStatus[] = [TaskStatus.ToDo, TaskStatus.Done];
const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.ToDo]: 'border-gray-300 dark:border-slate-500',
  [TaskStatus.Done]: 'border-green-400 dark:border-green-500',
};
const priorityClasses: Record<TaskPriority, string> = {
  [TaskPriority.Today]: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300',
  [TaskPriority.Upcoming]: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
  [TaskPriority.Anytime]: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
  [TaskPriority.Someday]: 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300',
};

const TaskPill: React.FC<{ task: Task, onEditTask: (task: Task) => void }> = ({ task, onEditTask }) => {
    return (
        <button 
            onClick={() => onEditTask(task)}
            className="w-full bg-white dark:bg-slate-800 p-2 rounded-md text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
            <p className={`text-sm font-medium ${task.status === TaskStatus.Done ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
            <div className="flex items-center justify-between mt-2">
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${priorityClasses[task.priority]}`}>
                    {task.priority}
                </span>
                 {task.dueDate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                 )}
            </div>
        </button>
    );
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, goalTitle, tasks, onEditTask }) => {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      [TaskStatus.ToDo]: [],
      [TaskStatus.Done]: [],
    };
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter(task => task.status === TaskStatus.Done).length;
    return Math.round((doneTasks / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className="flex-shrink-0 w-80 bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <TargetIcon className="w-4 h-4 mr-2" />
            <span>{goalTitle}</span>
        </div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{project.title}</h3>
        <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                <div className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>
      
      <div className="flex-grow p-2 space-y-4 overflow-y-auto">
        {statusOrder.map(status => (
          <div key={status}>
            <h4 className={`text-xs font-bold uppercase text-slate-600 dark:text-slate-400 px-2 pb-1 border-b-2 ${statusColors[status]}`}>
              {status} ({tasksByStatus[status].length})
            </h4>
            <div className="mt-2 space-y-2 px-1">
              {tasksByStatus[status].length > 0 ? (
                tasksByStatus[status]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map(task => <TaskPill key={task.id} task={task} onEditTask={onEditTask} />)
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectCard;