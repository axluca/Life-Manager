import React, { useState, useCallback, useEffect } from 'react';
import { Goal, Value } from '../types';
import { TargetIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';
import GoalModal from './GoalModal';

interface GoalListProps {
  goals: Goal[];
  values: Value[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'order'>) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onReorderGoals: (reorderedGoals: Goal[]) => void;
}

const GoalList: React.FC<GoalListProps> = ({ goals, values, onAddGoal, onUpdateGoal, onDeleteGoal, onReorderGoals }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  
  const [dragState, setDragState] = useState<{
    goalId: string;
    index: number;
    elementHeight: number;
    initialY: number;
    currentY: number;
  } | null>(null);
  
  const [settlingState, setSettlingState] = useState<{
    goalId: string;
    transformY: number;
    fromIndex: number;
    toIndex: number;
    elementHeight: number;
  } | null>(null);


  const getValueText = (id: string) => {
    return values.find(v => v.id === id)?.text || '';
  };

  const handleEdit = (goal: Goal) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGoalToEdit(null);
  };
  
  const handleSaveGoal = (goalData: Goal | Omit<Goal, 'id' | 'order'>) => {
    if ('id' in goalData) {
      onUpdateGoal(goalData as Goal);
    } else {
      onAddGoal(goalData);
    }
    handleCloseModal();
  };
  
  const handleMouseDown = (e: React.MouseEvent, index: number, goal: Goal) => {
    if (e.button !== 0 || isModalOpen || settlingState) return;
    e.preventDefault();

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    setDragState({
        index,
        goalId: goal.id,
        elementHeight: (e.currentTarget as HTMLElement).offsetHeight,
        initialY: e.clientY,
        currentY: e.clientY
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragState(prev => {
        if (!prev) return null;
        return { ...prev, currentY: e.clientY };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (!dragState) return;

    const fromIndex = dragState.index;
    const dy = dragState.currentY - dragState.initialY;
    const gap = 12; // Corresponds to space-y-3 (0.75rem)
    const totalHeight = dragState.elementHeight + gap;
    const displacedItems = Math.round(dy / totalHeight);
    const toIndex = Math.max(0, Math.min(goals.length - 1, fromIndex + displacedItems));
    
    if (fromIndex !== toIndex) {
        const finalTransformY = (toIndex - fromIndex) * totalHeight;
        
        setSettlingState({
          goalId: dragState.goalId,
          transformY: finalTransformY,
          fromIndex: fromIndex,
          toIndex: toIndex,
          elementHeight: dragState.elementHeight,
        });
        setDragState(null); // Clear drag state immediately

        setTimeout(() => {
            const reorderedGoals = [...goals];
            const [item] = reorderedGoals.splice(fromIndex, 1);
            reorderedGoals.splice(toIndex, 0, item);
            onReorderGoals(reorderedGoals);

            setSettlingState(null);
        }, 200); // This duration MUST match the CSS transition duration
    } else {
        setDragState(null);
    }
}, [dragState, goals, onReorderGoals, handleMouseMove]);

  
  useEffect(() => {
    if (dragState) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);


  return (
    <>
      <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TargetIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
            <h2 className="ml-3 text-xl font-bold text-slate-900 dark:text-gray-100">Life Goals</h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1 -ml-1" />
            New Goal
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Create long-term aspirations that are aligned with your core values. Drag to reorder by priority.</p>

        <div className="space-y-3 relative">
          {goals.map((goal, index) => {
            const isDragging = dragState?.goalId === goal.id;
            const isSettling = settlingState?.goalId === goal.id;

            const style: React.CSSProperties = { transition: 'transform 0.2s ease-in-out' };

            if (isSettling) {
                style.transform = `translateY(${settlingState.transformY}px)`;
                style.zIndex = 10;
                style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
            } else if (dragState) { // An item is being actively dragged
                if (isDragging) {
                    const dy = dragState.currentY - dragState.initialY;
                    style.transform = `translateY(${dy}px)`;
                    style.zIndex = 10;
                    style.transition = 'none';
                    style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
                } else {
                    let shiftY = 0;
                    const fromIndex = dragState.index;
                    const totalHeight = dragState.elementHeight + 12;

                    const dy = dragState.currentY - dragState.initialY;
                    const displacedItems = Math.round(dy / totalHeight);
                    const toIndex = Math.max(0, Math.min(goals.length - 1, fromIndex + displacedItems));
                    
                    if (fromIndex < toIndex) { // Dragging down
                        if (index > fromIndex && index <= toIndex) shiftY = -totalHeight;
                    } else if (fromIndex > toIndex) { // Dragging up
                        if (index >= toIndex && index < fromIndex) shiftY = totalHeight;
                    }
                    style.transform = `translateY(${shiftY}px)`;
                }
            } else if (settlingState) { // An item is settling, others hold position
                let shiftY = 0;
                const { fromIndex, toIndex, elementHeight } = settlingState;
                const totalHeight = elementHeight + 12;
                
                if (fromIndex < toIndex) { // Dragging down
                    if (index > fromIndex && index <= toIndex) shiftY = -totalHeight;
                } else if (fromIndex > toIndex) { // Dragging up
                    if (index >= toIndex && index < fromIndex) shiftY = totalHeight;
                }
                style.transform = `translateY(${shiftY}px)`;
                // Freeze other items during the settle animation
                style.transition = 'none';
            }

            return (
              <div 
                key={goal.id}
                onMouseDown={(e) => handleMouseDown(e, index, goal)}
                className="group bg-gray-100/50 dark:bg-slate-700/50 p-4 rounded-lg"
                style={{
                    ...style,
                    cursor: dragState ? 'grabbing' : 'grab',
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{goal.title}</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{goal.description}</p>
                  </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ml-4 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(goal); }} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                          <PencilIcon className="h-4 w-4"/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }} className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                          <TrashIcon className="h-4 w-4"/>
                      </button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {goal.valueIds.map(vid => (
                    <span key={vid} className="inline-block bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-xs font-medium px-2 py-1 rounded-full">
                      {getValueText(vid)}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
         {goals.length === 0 && !dragState && !settlingState && (
            <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                <p>Your life goals will appear here.</p>
                <p>Click "New Goal" to get started.</p>
            </div>
          )}
        </div>
      </div>
      
      {isModalOpen && (
        <GoalModal
          values={values}
          goalToEdit={goalToEdit}
          onClose={handleCloseModal}
          onSaveGoal={handleSaveGoal}
        />
      )}
    </>
  );
};

export default GoalList;