import React, { useState, useEffect } from 'react';
import { Project, Goal } from '../types';
import { XIcon } from './icons';

interface ProjectModalProps {
  goals: Goal[];
  projectToEdit?: Project | null;
  onClose: () => void;
  onSaveProject: (project: Project | Omit<Project, 'id'>) => void;
}

const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";

const ProjectModal: React.FC<ProjectModalProps> = ({ goals, projectToEdit, onClose, onSaveProject }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState<string>(goals[0]?.id || '');

  const isEditing = !!projectToEdit;

  useEffect(() => {
    if (isEditing) {
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description);
      setGoalId(projectToEdit.goalId);
    }
  }, [projectToEdit, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && goalId) {
      const projectData = { title, description, goalId };
      if (isEditing) {
        onSaveProject({ ...projectData, id: projectToEdit.id });
      } else {
        onSaveProject(projectData);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Project' : 'Create a New Project'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="project-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project Title</label>
              <input type="text" id="project-title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., 16-Week Training Plan" className={inputStyle} />
            </div>
            <div>
              <label htmlFor="project-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea id="project-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is the main objective of this project?" className={inputStyle} />
            </div>
            <div>
              <label htmlFor="project-goal" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link to Life Goal</label>
              <select id="project-goal" value={goalId} onChange={e => setGoalId(e.target.value)} required className={inputStyle}>
                {goals.length === 0 ? (
                  <option disabled>Please create a goal first</option>
                ) : (
                  goals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
            <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
              {isEditing ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;