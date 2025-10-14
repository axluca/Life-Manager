import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, Goal, Project, TimeFormat } from '../types';
import TaskItem from './TaskItem';
import { ChevronDownIcon, PlusIcon } from './icons';
import TaskModal from './TaskModal';

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  searchQuery: string;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  timeFormat: TimeFormat;
}

const priorityOrder: TaskPriority[] = [
  TaskPriority.Today,
  TaskPriority.Upcoming,
  TaskPriority.Anytime,
  TaskPriority.Someday,
];

const priorityFilterConfig: Record<TaskPriority, { active: string; inactive: string }> = {
  [TaskPriority.Today]: { active: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/50 dark:ring-yellow-400/50', inactive: '' },
  [TaskPriority.Upcoming]: { active: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 ring-1 ring-inset ring-red-500/50 dark:ring-red-400/50', inactive: '' },
  [TaskPriority.Anytime]: { active: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 ring-1 ring-inset ring-blue-500/50 dark:ring-blue-400/50', inactive: '' },
  [TaskPriority.Someday]: { active: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-400/50 dark:ring-gray-500/50', inactive: '' },
};
const inactiveFilterClasses = 'bg-gray-200 hover:bg-gray-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';


const TasksView: React.FC<TasksViewProps> = ({ tasks, projects, goals, searchQuery, onUpdateTask, onDeleteTask, onAddTask, timeFormat }) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isGoalFilterOpen, setIsGoalFilterOpen] = useState(false);
  const goalFilterRef = useRef<HTMLDivElement>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; taskToEdit: Task | null }>({ isOpen: false, taskToEdit: null });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (goalFilterRef.current && !goalFilterRef.current.contains(event.target as Node)) {
        setIsGoalFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProjectTitle = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.title || 'Unlinked Project';
  }

  const projectGoalMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.goalId]));
  }, [projects]);

  const filteredTasks = useMemo(() => {
    let tempTasks = tasks.filter(task => showCompleted || task.status !== TaskStatus.Done);
    
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
  }, [tasks, showCompleted, priorityFilter, selectedGoalIds, projectGoalMap, searchQuery]);

  const tasksByPriority = useMemo(() => {
    const grouped: Record<TaskPriority, Task[]> = {
      [TaskPriority.Today]: [],
      [TaskPriority.Upcoming]: [],
      [TaskPriority.Anytime]: [],
      [TaskPriority.Someday]: [],
    };
    filteredTasks.forEach(task => {
      grouped[task.priority].push(task);
    });
    return grouped;
  }, [filteredTasks]);
  
  const handlePriorityFilterToggle = (priority: TaskPriority) => {
    setPriorityFilter(prev => prev === priority ? null : priority);
  };

  const handleGoalSelection = (goalId: string) => {
    setSelectedGoalIds(prev => 
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const handleOpenModal = (task: Task | null) => {
    setModalState({ isOpen: true, taskToEdit: task });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, taskToEdit: null });
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
      <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks List</h1>
          <button
            onClick={() => handleOpenModal(null)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
            title="Add New Task"
          >
            <PlusIcon className="h-5 w-5 mr-1 -ml-1" />
            New Task
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 pb-6">
          {priorityOrder.map(priority => {
              const isActive = priorityFilter === priority;
              const classes = isActive ? priorityFilterConfig[priority].active : inactiveFilterClasses;
              
              return (
                  <button 
                      key={priority}
                      onClick={() => handlePriorityFilterToggle(priority)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${classes}`}
                  >
                      {priority}
                  </button>
              )
          })}
          <div ref={goalFilterRef} className="relative">
            <button 
              onClick={() => setIsGoalFilterOpen(!isGoalFilterOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              <span>Filter by Goal</span>
              {selectedGoalIds.length > 0 && <span className="bg-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{selectedGoalIds.length}</span>}
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isGoalFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isGoalFilterOpen && (
              <div className="absolute top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl z-10 p-2">
                {goals.length > 0 ? goals.map(goal => (
                  <label key={goal.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selectedGoalIds.includes(goal.id)} onChange={() => handleGoalSelection(goal.id)} className="h-4 w-4 rounded bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600" />
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{goal.title}</span>
                  </label>
                )) : <p className="text-sm text-slate-500 p-2">No goals found.</p>}
                 {selectedGoalIds.length > 0 && <button onClick={() => setSelectedGoalIds([])} className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 pt-2 mt-2 border-t border-gray-200 dark:border-slate-700 hover:underline">Clear all</button>}
              </div>
            )}
          </div>
          <div className="flex items-center">
              <label htmlFor="show-completed" className="mr-2 text-sm text-slate-700 dark:text-slate-300">Show Done</label>
              <input 
                  id="show-completed"
                  type="checkbox" 
                  checked={showCompleted} 
                  onChange={() => setShowCompleted(!showCompleted)}
                  className="h-4 w-4 rounded bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              />
          </div>
        </div>

        <div className="space-y-8">
          {priorityOrder.map(priority => (
            tasksByPriority[priority].length > 0 && (
              <div key={priority}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{priority}</h2>
                <div className="space-y-3">
                  {tasksByPriority[priority].map(task => (
                    <div key={task.id} className="bg-gray-100/50 dark:bg-slate-700/50 rounded-lg p-2">
                      <TaskItem 
                        task={task}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onEditTask={handleOpenModal}
                        timeFormat={timeFormat}
                      />
                      {task.projectId && (
                        <p className="text-xs text-slate-500 px-2 pt-1">
                          Project: {getProjectTitle(task.projectId)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
           {filteredTasks.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                  {searchQuery ? (
                    <p>No tasks match your search for "{searchQuery}".</p>
                  ) : (
                    <p>No tasks match your current filters.</p>
                  )}
              </div>
          )}
        </div>
      </div>
      {modalState.isOpen && (
        <TaskModal
          projects={projects}
          taskToEdit={modalState.taskToEdit}
          onClose={handleCloseModal}
          onSaveTask={handleSaveTask}
        />
      )}
    </>
  );
};

export default TasksView;