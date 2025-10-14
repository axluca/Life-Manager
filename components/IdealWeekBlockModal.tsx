import React, { useState, useEffect } from 'react';
import { IdealWeekBlock, IdealWeekBlockType, Project, Goal } from '../types';
import { XIcon, PlusIcon, TrashIcon } from './icons';
import ProjectModal from './ProjectModal';

interface IdealWeekBlockModalProps {
  blockToEdit?: IdealWeekBlock | null;
  defaults?: Partial<IdealWeekBlock>;
  onClose: () => void;
  onSave: (block: Omit<IdealWeekBlock, 'id'> | IdealWeekBlock) => void;
  onDelete: (id: string) => void;
  projects: Project[];
  goals: Goal[];
  onAddProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  onConvertToHabit: (block: Partial<IdealWeekBlock>) => void;
}

const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";

const IdealWeekBlockModal: React.FC<IdealWeekBlockModalProps> = ({
  blockToEdit,
  defaults,
  onClose,
  onSave,
  onDelete,
  projects,
  goals,
  onAddProject,
  onConvertToHabit,
}) => {
  const [type, setType] = useState<IdealWeekBlockType>(blockToEdit?.type || defaults?.type || 'task');
  const [projectId, setProjectId] = useState<string>(blockToEdit?.projectId || '');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const isEditing = !!blockToEdit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = type === 'project' ? (projects.find(p => p.id === projectId)?.title || 'Project Time') : 'Task Time';

    const blockData: Omit<IdealWeekBlock, 'id'> = {
      dayOfWeek: blockToEdit?.dayOfWeek ?? defaults?.dayOfWeek ?? 0,
      startTime: blockToEdit?.startTime ?? defaults?.startTime ?? '09:00',
      duration: blockToEdit?.duration ?? defaults?.duration ?? 60,
      type,
      title,
      projectId: type === 'project' ? projectId : null,
    };

    if (isEditing) {
      onSave({ ...blockData, id: blockToEdit.id });
    } else {
      onSave(blockData);
    }
  };
  
  const handleAddProjectAndSave = async (projectData: Omit<Project, 'id'>) => {
    const newProject = await onAddProject(projectData);
    setIsProjectModalOpen(false);
    setProjectId(newProject.id);
  };
  
  const handleDelete = () => {
    if (isEditing) {
        onDelete(blockToEdit.id);
        onClose();
    }
  };

  const handleConvertToHabitClick = () => {
    onConvertToHabit(blockToEdit || defaults || {});
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-8 sm:pt-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Time Block' : 'Create Time Block'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Block Type</label>
              <div className="flex rounded-lg p-1 bg-gray-200 dark:bg-slate-900 w-full">
                <button
                  type="button"
                  onClick={() => setType('task')}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-shadow ${type === 'task' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Task Time
                </button>
                <button
                  type="button"
                  onClick={() => setType('project')}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-shadow ${type === 'project' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Project Time
                </button>
                <button
                  type="button"
                  onClick={handleConvertToHabitClick}
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-shadow text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                >
                  Habit Time
                </button>
              </div>
            </div>

            {type === 'project' && (
              <div>
                <label htmlFor="project-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link to Project</label>
                {projects.length > 0 ? (
                    <select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} required className={inputStyle}>
                        <option value="" disabled>Select a project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                ) : (
                    <div className="text-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-md">
                        <p className="text-sm text-slate-500 mb-3">No projects found.</p>
                        <button 
                            type="button"
                            onClick={() => setIsProjectModalOpen(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                        >
                            <PlusIcon className="h-4 w-4 mr-1"/>
                            New Project
                        </button>
                    </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-between">
            {isEditing ? (
                 <button onClick={handleDelete} type="button" className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2">
                    <TrashIcon className="h-4 w-4" />
                    Delete
                </button>
            ) : ( <div /> )}
            <div className="flex justify-end">
              <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
              <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
                {isEditing ? 'Save Changes' : 'Create Block'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    {isProjectModalOpen && (
        <ProjectModal
            goals={goals}
            onClose={() => setIsProjectModalOpen(false)}
            onSaveProject={handleAddProjectAndSave}
        />
    )}
    </>
  );
};

export default IdealWeekBlockModal;