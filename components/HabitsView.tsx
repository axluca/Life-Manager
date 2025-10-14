import React, { useState } from 'react';
import { Habit } from '../types';
import { FlameIcon, PlusIcon } from './icons';
import HabitTracker from './HabitTracker';
import HabitModal from './HabitModal';

interface HabitsViewProps {
  habits: Habit[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'order' | 'completedDates'>) => void;
  onUpdateHabit: (habit: Omit<Habit, 'completedDates' | 'order'>) => void;
  onDeleteHabit: (id: string) => void;
  onToggleDate: (habitId: string, date: string) => void;
}

const HabitsView: React.FC<HabitsViewProps> = ({ habits, onAddHabit, onUpdateHabit, onDeleteHabit, onToggleDate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const handleEditHabit = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setHabitToEdit(null);
  };

  const handleSaveHabit = (habitData: Omit<Habit, 'id' | 'order' | 'completedDates'> | Omit<Habit, 'completedDates' | 'order'>) => {
    if ('id' in habitData) {
      onUpdateHabit(habitData);
    } else {
      onAddHabit(habitData);
    }
    handleCloseModal();
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FlameIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            <h1 className="ml-3 text-3xl font-bold">Habits</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
            New Habit
          </button>
        </div>

        {habits.length > 0 ? (
          <div className="space-y-6">
            {habits.map(habit => (
              <HabitTracker
                key={habit.id}
                habit={habit}
                onToggleDate={onToggleDate}
                onEdit={handleEditHabit}
                onDelete={onDeleteHabit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
            <FlameIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No habits yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new habit.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <HabitModal
          habitToEdit={habitToEdit}
          onClose={handleCloseModal}
          onSave={handleSaveHabit}
        />
      )}
    </>
  );
};

export default HabitsView;
