import React, { useMemo } from 'react';
import { Task, TaskStatus, TimeFormat } from '../types';
import { PlusIcon, ClipboardCheckIcon } from './icons';
import TaskItem from './TaskItem';

interface TaskListProps {
  projectId: string;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskClick: () => void;
  onEditTask: (task: Task) => void;
  timeFormat: TimeFormat;
}

const TaskList: React.FC<TaskListProps> = ({ projectId, tasks, onUpdateTask, onDeleteTask, onAddTaskClick, onEditTask, timeFormat }) => {

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      [TaskStatus.ToDo]: [],
      [TaskStatus.Done]: [],
    };
    tasks.forEach(task => {
      grouped[task.status].push(task);
    });
    return grouped;
  }, [tasks]);
  
  const statusOrder: TaskStatus[] = [TaskStatus.ToDo, TaskStatus.Done];

  return (
    <>
      <div className="border-t border-gray-200/50 dark:border-slate-600/50 mt-4 pt-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                <ClipboardCheckIcon className="h-4 w-4 mr-2" />
                Tasks
            </h4>
            <button
                onClick={onAddTaskClick}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/40 focus:outline-none"
            >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Task
            </button>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-4">
            {statusOrder.map(status => (
              tasksByStatus[status].length > 0 && (
                <div key={status}>
                  <h5 className="text-xs font-bold uppercase text-slate-500 mb-1">{status}</h5>
                  <div className="space-y-2">
                    {tasksByStatus[status]
                      .sort((a, b) => a.title.localeCompare(b.title))
                      .map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onUpdateTask={onUpdateTask} 
                          onDeleteTask={onDeleteTask}
                          onEditTask={onEditTask}
                          timeFormat={timeFormat}
                        />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 py-2">No tasks yet. Add one to get started!</p>
        )}
      </div>
    </>
  );
};

export default TaskList;
