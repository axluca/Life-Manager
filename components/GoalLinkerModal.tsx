import React, { useState } from 'react';
import { Goal } from '../types';
import { XIcon, TargetIcon } from './icons';

interface GoalLinkerModalProps {
  allGoals: Goal[];
  linkedGoalIds: string[];
  onClose: () => void;
  onSave: (newGoalIds: string[]) => void;
}

const GoalLinkerModal: React.FC<GoalLinkerModalProps> = ({ allGoals, linkedGoalIds, onClose, onSave }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedGoalIds);

  const handleToggle = (goalId: string) => {
    setSelectedIds(prev =>
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const handleSave = () => {
    onSave(selectedIds);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <TargetIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mr-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Link Goals to Review</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-6 space-y-2">
          {allGoals.length > 0 ? (
            allGoals.map(goal => (
              <label key={goal.id} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${selectedIds.includes(goal.id) ? 'bg-indigo-100 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500' : 'bg-gray-100 dark:bg-slate-700/50 border-transparent hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(goal.id)}
                  onChange={() => handleToggle(goal.id)}
                  className="h-5 w-5 rounded bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 shrink-0"
                />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{goal.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{goal.description}</p>
                </div>
              </label>
            ))
          ) : (
            <p className="text-center text-slate-500">You haven't created any goals yet.</p>
          )}
        </div>
        <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
          <button onClick={handleSave} type="button" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
            Save Links
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalLinkerModal;