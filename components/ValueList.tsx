import React, { useState, useRef, useEffect } from 'react';
import { Value } from '../types';
import { TreeIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';

interface ValueListProps {
  values: Value[];
  onAddValue: (text: string) => void;
  onUpdateValue: (id: string, text: string) => void;
  onDeleteValue: (id: string) => void;
}

const ValueList: React.FC<ValueListProps> = ({ values, onAddValue, onUpdateValue, onDeleteValue }) => {
  const [newValue, setNewValue] = useState('');
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingValueId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingValueId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue('');
    }
  };
  
  const handleEdit = (value: Value) => {
    setEditingValueId(value.id);
    setEditingText(value.text);
  };

  const handleUpdate = () => {
    if (editingValueId && editingText.trim()) {
      onUpdateValue(editingValueId, editingText.trim());
    }
    setEditingValueId(null);
    setEditingText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUpdate();
    } else if (e.key === 'Escape') {
      setEditingValueId(null);
      setEditingText('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg h-full p-6">
      <div className="flex items-center mb-4">
        <TreeIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
        <h2 className="ml-3 text-xl font-bold text-slate-900 dark:text-gray-100">Core Values</h2>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Define the principles that guide your life. These are the roots of your goals.</p>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="e.g., Continuous Learning"
          className="flex-grow appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="flex-shrink-0 inline-flex items-center justify-center p-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          aria-label="Add Value"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </form>

      <div className="space-y-3">
        {values.length > 0 ? (
          values.map(value => (
            <div key={value.id} className="group bg-gray-100/50 dark:bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
              {editingValueId === value.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={handleUpdate}
                  onKeyDown={handleKeyDown}
                  className="flex-grow bg-transparent focus:outline-none text-slate-800 dark:text-slate-200"
                />
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button onClick={() => handleEdit(value)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      <PencilIcon className="h-4 w-4"/>
                    </button>
                    <button onClick={() => onDeleteValue(value.id)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                      <TrashIcon className="h-4 w-4"/>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="text-center text-slate-500 text-sm py-4">Add your first core value to begin.</p>
        )}
      </div>
    </div>
  );
};

export default ValueList;