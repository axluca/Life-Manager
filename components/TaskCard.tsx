import React from 'react';
import { Task, TaskPriority, Project, TaskStatus } from '../types';

interface TaskCardProps {
    task: Task;
    project?: Project;
    onClick: () => void;
    onUpdateTask: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    isDragging: boolean;
}

const priorityClasses: Record<TaskPriority, { border: string; text: string; bg: string; }> = {
    [TaskPriority.Today]: { border: 'border-yellow-400', text: 'text-yellow-800 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-500/10' },
    [TaskPriority.Upcoming]: { border: 'border-red-400', text: 'text-red-800 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-500/10' },
    [TaskPriority.Anytime]: { border: 'border-blue-400', text: 'text-blue-800 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-500/10' },
    [TaskPriority.Someday]: { border: 'border-gray-400', text: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/10' },
};

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onClick, onUpdateTask, onDragStart, isDragging }) => {
    const priorityStyle = priorityClasses[task.priority];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
    const isOverdue = taskDate && taskDate < today && task.status !== TaskStatus.Done;

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent modal from opening
        const newStatus = e.target.checked ? TaskStatus.Done : TaskStatus.ToDo;
        onUpdateTask({ ...task, status: newStatus });
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
            className={`bg-white dark:bg-slate-700/50 p-3 rounded-lg border-l-4 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-slate-700 transition-all ${priorityStyle.border} ${isDragging ? 'opacity-30 rotate-3' : 'opacity-100'} ${isOverdue ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-red-500' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="relative flex items-center justify-center h-5 w-5 flex-shrink-0 mt-0.5">
                    <input
                        type="checkbox"
                        checked={task.status === TaskStatus.Done}
                        onChange={handleCheckboxChange}
                        onClick={(e) => e.stopPropagation()}
                        className="peer appearance-none h-5 w-5 rounded border cursor-pointer
                                    bg-indigo-200 border-indigo-200 
                                    dark:bg-slate-600 dark:border-slate-500 
                                    checked:bg-indigo-600 checked:border-transparent 
                                    dark:checked:bg-indigo-500 dark:checked:border-transparent
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
                                    dark:focus:ring-offset-slate-700"
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
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-slate-900 dark:text-slate-100 ${task.status === TaskStatus.Done ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                    </h4>
                    {project && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 truncate">{project.title}</p>}
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityStyle.bg} ${priorityStyle.text}`}>
                    {task.priority}
                </span>
                {task.dueDate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                 )}
            </div>
        </div>
    );
}

export default TaskCard;