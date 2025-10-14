import React from 'react';
import { Task, TaskStatus, TaskPriority, TimeFormat } from '../types';
import { PencilIcon, TrashIcon } from './icons';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  timeFormat: TimeFormat;
}

const priorityClasses: Record<TaskPriority, string> = {
  [TaskPriority.Today]: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300',
  [TaskPriority.Upcoming]: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
  [TaskPriority.Anytime]: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
  [TaskPriority.Someday]: 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdateTask, onDeleteTask, onEditTask, timeFormat }) => {

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.checked ? TaskStatus.Done : TaskStatus.ToDo;
    onUpdateTask({ ...task, status: newStatus });
  };

  const dueDateTime = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || '23:59:59'}`) : null;
  const isOverdue = dueDateTime && dueDateTime < new Date() && task.status !== TaskStatus.Done;

  return (
    <div className="group bg-white dark:bg-slate-800 p-2 rounded-md flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/80">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex items-center justify-center h-5 w-5 flex-shrink-0">
          <input
            type="checkbox"
            checked={task.status === TaskStatus.Done}
            onChange={handleCheckboxChange}
            className="peer appearance-none h-5 w-5 rounded border cursor-pointer
                       bg-indigo-200 border-indigo-200 
                       dark:bg-slate-600 dark:border-slate-500 
                       checked:bg-indigo-600 checked:border-transparent 
                       dark:checked:bg-indigo-500 dark:checked:border-transparent
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
                       dark:focus:ring-offset-slate-800"
            aria-label={`Mark task ${task.title} as done`}
          />
          <svg
            className="absolute w-3 h-3 text-white pointer-events-none hidden peer-checked:block"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <span className={`text-sm truncate ${task.status === TaskStatus.Done ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
          {task.title}
        </span>
      </div>
      
      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          {task.dueDate && (
              <span className={`text-xs font-medium ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {task.dueTime && `, ${new Date(`1970-01-01T${task.dueTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' })}`}
              </span>
          )}

          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityClasses[task.priority]}`}>
              {task.priority}
          </span>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button onClick={() => onEditTask(task)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <PencilIcon className="h-3.5 w-3.5"/>
              </button>
              <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                  <TrashIcon className="h-3.5 w-3.5"/>
              </button>
          </div>
      </div>
    </div>
  );
};

export default TaskItem;
