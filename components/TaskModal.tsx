import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, Project } from '../types';
import { XIcon } from './icons';

interface TaskModalProps {
  projectId?: string;
  projects?: Project[];
  taskToEdit?: Task | null;
  onClose: () => void;
  onSaveTask: (task: Task | Omit<Task, 'id'>) => void;
}

const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";
const pickerIndicatorStyle = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8) brightness(0.8);
  }
  .dark input[type="date"]::-webkit-calendar-picker-indicator,
  .dark input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
  }
`;

const TaskModal: React.FC<TaskModalProps> = ({ projectId, projects, taskToEdit, onClose, onSaveTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Anytime);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [currentProjectId, setCurrentProjectId] = useState(taskToEdit?.projectId || projectId || '');

  const isEditing = !!taskToEdit;
  const showProjectSelector = !!projects;

  useEffect(() => {
    if (isEditing) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate || '');
      setDueTime(taskToEdit.dueTime || '');
      setDuration(taskToEdit.duration || 60);
      setCurrentProjectId(taskToEdit.projectId || '');
    }
  }, [taskToEdit, isEditing]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title) {
        const taskDetails = {
            title,
            description,
            projectId: currentProjectId || null,
            priority,
            dueDate: dueDate || null,
            dueTime: dueDate && dueTime ? dueTime : null,
            duration: dueDate && dueTime ? duration : 60,
        };

        if (isEditing) {
            onSaveTask({ 
                ...taskDetails, 
                id: taskToEdit.id,
                status: taskToEdit.status, 
            });
        } else {
            onSaveTask({
                ...taskDetails,
                status: TaskStatus.ToDo,
            });
        }
    }
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value as TaskPriority;
    setPriority(newPriority);

    if (newPriority === TaskPriority.Today) {
      setDueDate(getTodayString());
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDueDate(newDate);

    if (newDate === getTodayString()) {
        setPriority(TaskPriority.Today);
    } else if (priority === TaskPriority.Today) {
        setPriority(TaskPriority.Anytime); 
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <style>{pickerIndicatorStyle}</style>
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Task' : 'Create a New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form id="task-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
            {showProjectSelector && (
                <div>
                    <label htmlFor="task-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project</label>
                    <select 
                        id="task-project" 
                        value={currentProjectId} 
                        onChange={e => setCurrentProjectId(e.target.value)} 
                        className={inputStyle}
                    >
                        <option value="">-- No Project --</option>
                        {projects?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
            )}
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
              <input type="text" id="task-title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Draft initial UI mockups" className={inputStyle} />
            </div>
            <div>
              <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
              <textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add any details, links, or notes here." className={inputStyle} />
            </div>
             <div>
                <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                <select id="task-priority" value={priority} onChange={handlePriorityChange} className={inputStyle}>
                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="task-duedate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                    <input type="date" id="task-duedate" value={dueDate} onChange={handleDateChange} className={inputStyle} />
                </div>
                 <div>
                    <label htmlFor="task-duetime" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Time</label>
                    <input type="time" id="task-duetime" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} className={`${inputStyle} disabled:opacity-50`} />
                </div>
            </div>
             <div className="grid grid-cols-1">
                <div>
                    <label htmlFor="task-duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (minutes)</label>
                    <input type="number" id="task-duration" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} min="15" step="15" disabled={!dueDate || !dueTime} className={`${inputStyle} disabled:opacity-50`} />
                </div>
            </div>
        </form>
        <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-end flex-shrink-0">
            <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
            <button type="submit" form="task-form" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
              {isEditing ? 'Save Changes' : 'Add Task'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;