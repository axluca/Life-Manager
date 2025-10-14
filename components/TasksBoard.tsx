import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, Goal, Project } from '../types';
import { ChevronDownIcon, PlusIcon } from './icons';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

interface TasksBoardProps {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  searchQuery: string;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

const statusOrder: TaskStatus[] = [TaskStatus.ToDo, TaskStatus.Done];
const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
  [TaskStatus.ToDo]: { bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-300' },
  [TaskStatus.Done]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-400' },
};

const priorityFilterConfig: Record<TaskPriority, { active: string; inactive: string }> = {
  [TaskPriority.Today]: { active: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/50 dark:ring-yellow-400/50', inactive: '' },
  [TaskPriority.Upcoming]: { active: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 ring-1 ring-inset ring-red-500/50 dark:ring-red-400/50', inactive: '' },
  [TaskPriority.Anytime]: { active: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 ring-1 ring-inset ring-blue-500/50 dark:ring-blue-400/50', inactive: '' },
  [TaskPriority.Someday]: { active: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-400/50 dark:ring-gray-500/50', inactive: '' },
};
const inactiveFilterClasses = 'bg-gray-200 hover:bg-gray-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';

const TasksBoard: React.FC<TasksBoardProps> = ({ tasks, projects, goals, searchQuery, onUpdateTask, onAddTask }) => {
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isGoalFilterOpen, setIsGoalFilterOpen] = useState(false);
  const goalFilterRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (goalFilterRef.current && !goalFilterRef.current.contains(event.target as Node)) {
        setIsGoalFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const projectGoalMap = useMemo(() => new Map(projects.map(p => [p.id, p.goalId])), [projects]);

  const filteredTasks = useMemo(() => {
    let tempTasks = tasks;
    if (priorityFilter) {
      tempTasks = tempTasks.filter(task => task.priority === priorityFilter);
    }
    if (selectedGoalIds.length > 0) {
      tempTasks = tempTasks.filter(task => {
        if (!task.projectId) return false;
        const goalId = projectGoalMap.get(task.projectId);
        return goalId ? selectedGoalIds.includes(goalId) : false;
      });
    }
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        tempTasks = tempTasks.filter(task =>
            task.title.toLowerCase().includes(lowercasedQuery) ||
            task.description.toLowerCase().includes(lowercasedQuery)
        );
    }
    return tempTasks;
  }, [tasks, priorityFilter, selectedGoalIds, projectGoalMap, searchQuery]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { [TaskStatus.ToDo]: [], [TaskStatus.Done]: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedTasks = [...filteredTasks].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate + 'T00:00:00') : null;
      const dateB = b.dueDate ? new Date(b.dueDate + 'T00:00:00') : null;

      if (!dateA && !dateB) return a.title.localeCompare(b.title);
      if (!dateA) return 1;
      if (!dateB) return -1;

      const isOverdueA = dateA < today && a.status !== TaskStatus.Done;
      const isOverdueB = dateB < today && b.status !== TaskStatus.Done;

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }

      return a.title.localeCompare(b.title);
    });

    sortedTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const handleGoalSelection = (goalId: string) => {
    setSelectedGoalIds(prev => prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]);
  };
  
  const handlePriorityFilterToggle = (priority: TaskPriority) => {
    setPriorityFilter(prev => prev === priority ? null : priority);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      const taskToMove = tasks.find(t => t.id === draggedTaskId);
      if (taskToMove && taskToMove.status !== newStatus) {
        onUpdateTask({ ...taskToMove, status: newStatus });
      }
    }
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };
  
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };
  
  const handleSaveTask = (taskData: Task | Omit<Task, 'id'>) => {
    if ('id' in taskData) {
      onUpdateTask(taskData as Task);
    } else {
      onAddTask(taskData);
    }
    handleCloseModal();
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 flex flex-col h-full max-h-[calc(100vh-10rem)]">
        <div className="flex-shrink-0 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks Board</h1>
             <button
              onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
              title="Add New Task"
            >
              <PlusIcon className="h-5 w-5 mr-1 -ml-1" />
              New Task
            </button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 my-4 flex-shrink-0">
          {/* Priority Filters */}
          {Object.values(TaskPriority).map(p => {
            const isActive = priorityFilter === p;
            const classes = isActive ? priorityFilterConfig[p].active : inactiveFilterClasses;
            return (
              <button
                key={p}
                onClick={() => handlePriorityFilterToggle(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${classes}`}
              >
                {p}
              </button>
            );
          })}
          {/* Goal Filter */}
          <div ref={goalFilterRef} className="relative">
            <button onClick={() => setIsGoalFilterOpen(!isGoalFilterOpen)} className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600">
              <span>Filter by Goal</span>
              {selectedGoalIds.length > 0 && <span className="bg-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{selectedGoalIds.length}</span>}
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isGoalFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isGoalFilterOpen && (
                <div className="absolute top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl z-10 p-2">
                {goals.map(goal => (
                    <label key={goal.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selectedGoalIds.includes(goal.id)} onChange={() => handleGoalSelection(goal.id)} className="h-4 w-4 rounded bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600" />
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{goal.title}</span>
                    </label>
                ))}
                {selectedGoalIds.length > 0 && <button onClick={() => setSelectedGoalIds([])} className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 pt-2 mt-2 border-t border-gray-200 dark:border-slate-700 hover:underline">Clear all</button>}
                </div>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {statusOrder.map(status => (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status)}
              className={`rounded-lg p-2 flex flex-col transition-colors ${statusColors[status].bg} ${dragOverStatus === status ? 'bg-indigo-100 dark:bg-slate-600/50' : ''}`}
            >
              <h3 className={`font-semibold px-2 py-1 rounded-md ${statusColors[status].text}`}>{status} ({tasksByStatus[status].length})</h3>
              <div className="mt-2 space-y-2 overflow-y-auto flex-1">
                {tasksByStatus[status].map(task => (
                  <TaskCard 
                    key={task.id}
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    onDragStart={handleDragStart}
                    onClick={() => handleEditTask(task)}
                    onUpdateTask={onUpdateTask}
                    isDragging={draggedTaskId === task.id}
                  />
                ))}
                {tasksByStatus[status].length === 0 && <div className="text-center text-sm text-slate-500 p-4">
                    {searchQuery ? `No tasks match "${searchQuery}"` : "No tasks in this category."}
                </div>}
              </div>
            </div>
          ))}
        </div>
      </div>
       {isModalOpen && (
        <TaskModal
          projects={projects}
          taskToEdit={taskToEdit}
          onClose={handleCloseModal}
          onSaveTask={handleSaveTask}
        />
      )}
    </>
  );
};

export default TasksBoard;