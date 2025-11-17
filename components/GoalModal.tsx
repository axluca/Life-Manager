import React, { useState, useEffect } from 'react';
import { Goal, Value } from '../types';
import { XIcon } from './icons';

interface GoalModalProps {
  values: Value[];
  goalToEdit?: Goal | null;
  onClose: () => void;
  onSaveGoal: (goal: Goal | Omit<Goal, 'id' | 'order'>) => void;
}

const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";

const GoalModal: React.FC<GoalModalProps> = ({ values, goalToEdit, onClose, onSaveGoal }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [identity, setIdentity] = useState('');
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);
  const [nearTerm, setNearTerm] = useState('');
  const [impactful, setImpactful] = useState('');
  const [concrete, setConcrete] = useState('');
  const [energizing, setEnergizing] = useState('');
  
  const isEditing = !!goalToEdit;

  useEffect(() => {
    if (isEditing) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description);
      setIdentity(goalToEdit.identity);
      setSelectedValueIds(goalToEdit.valueIds);
      setNearTerm('');
      setImpactful('');
      setConcrete('');
      setEnergizing('');
    }
  }, [goalToEdit, isEditing]);

  const handleValueChange = (valueId: string) => {
    setSelectedValueIds(prev =>
      prev.includes(valueId) ? prev.filter(id => id !== valueId) : [...prev, valueId]
    );
  };

  const handleCloseModal = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      const goalData = { 
        title: title.trim(), 
        description: description.trim(), 
        identity: identity.trim(), 
        valueIds: selectedValueIds 
      };
      if (isEditing) {
        onSaveGoal({ ...goalData, id: goalToEdit.id, order: goalToEdit.order });
      } else {
        onSaveGoal(goalData);
      }
      handleCloseModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Life Goal' : 'Create a New Life Goal'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form id="goal-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Goal Title</label>
            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Become fluent in Spanish" className={inputStyle} />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Desired Outcome</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={3} placeholder="How do I intend to get there? What does success look like?" className={inputStyle} />
          </div>

          <div>
            <label htmlFor="identity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Identity Tie-in (Optional)</label>
            <input 
              type="text" 
              id="identity" 
              value={identity} 
              onChange={e => setIdentity(e.target.value)} 
              placeholder="I am the kind of person who..." 
              className={inputStyle}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Link to Core Values</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {values.map(value => (
                <label key={value.id} className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer border transition-colors ${selectedValueIds.includes(value.id) ? 'bg-indigo-100/80 dark:bg-indigo-600/30 border-indigo-500' : 'bg-gray-100 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                  <input type="checkbox" checked={selectedValueIds.includes(value.id)} onChange={() => handleValueChange(value.id)} className="h-4 w-4 rounded bg-gray-300 dark:bg-slate-600 border-gray-400 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-800 dark:text-slate-200">{value.text}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">N.I.C.E. Goal Prompts</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Reflect on these to make your goal more actionable and motivating.</p>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300"><span className="font-bold text-indigo-600 dark:text-indigo-400">N</span>ear-term: What's a concrete first step?</label>
                    <input type="text" value={nearTerm} onChange={e => setNearTerm(e.target.value)} placeholder="e.g., Sign up for a local class this week." className={`${inputStyle} mt-1`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300"><span className="font-bold text-indigo-600 dark:text-indigo-400">I</span>mpactful: Why does this matter to me?</label>
                    <input type="text" value={impactful} onChange={e => setImpactful(e.target.value)} placeholder="e.g., To connect with my partner's family." className={`${inputStyle} mt-1`} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300"><span className="font-bold text-indigo-600 dark:text-indigo-400">C</span>oncrete: What does 'done' look like?</label>
                    <input type="text" value={concrete} onChange={e => setConcrete(e.target.value)} placeholder="e.g., Hold a 30-minute conversation." className={`${inputStyle} mt-1`} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300"><span className="font-bold text-indigo-600 dark:text-indigo-400">E</span>nergizing: What part of this excites me?</label>
                    <input type="text" value={energizing} onChange={e => setEnergizing(e.target.value)} placeholder="e.g., The idea of travelling through South America." className={`${inputStyle} mt-1`} />
                </div>
            </div>
          </div>

        </form>
        <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
          <button type="submit" form="goal-form" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
            {isEditing ? 'Save Changes' : 'Add Goal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;