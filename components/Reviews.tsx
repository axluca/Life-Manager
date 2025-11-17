import React, { useState, useEffect, useCallback } from 'react';
import { Review, ReviewCadence, Task, Project, Goal } from '../types';
import ReviewFunnel from './ReviewFunnel';
import AIPoweredInsights from './AIPoweredInsights';
import { ChevronLeftIcon, ChevronRightIcon, TargetIcon, PencilIcon } from './icons';
import GoalLinkerModal from './GoalLinkerModal';

interface ReviewsProps {
    tasks: Task[];
    projects: Project[];
    goals: Goal[];
    onUpdateReview: (review: Review) => Promise<Review>;
    setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
}

const REVIEW_PROMPTS: Record<ReviewCadence, string[]> = {
  Daily: [
    "What was my biggest win today?",
    "What challenges did I encounter?",
    "How were my energy levels throughout the day?",
    "One thing I'm grateful for today is...",
  ],
  Weekly: [
    "What went well this past week? What did I accomplish?",
    "What were the challenges or what could have gone better?",
    "How are my Quarterly Goals going?",
    "How did my actions this past week align with my wish identity?",
  ],
  Monthly: [
    "What were your key learnings this month?",
    "What were the next month's focus areas?",
    "Did you make progress on your quarterly goals?",
  ],
  Quarterly: [
    "What were your top 3 wins this quarter?",
    "What were the biggest challenges?",
    "What did you learn?",
    "How aligned were your actions with the values?",
  ],
  Annual: [
    "What were your major reflections for the year?",
    "What are your goal settings for the next year?",
    "What new habits do you want to build?",
  ]
};

const getDayId = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD
const getWeekId = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return `${date.getFullYear()}-W${(1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).toString().padStart(2, '0')}`;
};
const getMonthId = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
const getQuarterId = (d: Date) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
const getYearId = (d: Date) => d.getFullYear().toString();

const getPeriodId = (cadence: ReviewCadence, date: Date) => {
    switch (cadence) {
        case 'Daily': return getDayId(date);
        case 'Weekly': return getWeekId(date);
        case 'Monthly': return getMonthId(date);
        case 'Quarterly': return getQuarterId(date);
        case 'Annual': return getYearId(date);
    }
};

const getPeriodTitle = (cadence: ReviewCadence, date: Date): string => {
    switch (cadence) {
        case 'Daily': return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        case 'Weekly':
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Monday as start
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        case 'Monthly': return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        case 'Quarterly': return `${getQuarterId(date)} ${date.getFullYear()}`;
        case 'Annual': return date.getFullYear().toString();
    }
};


const Reviews: React.FC<ReviewsProps> = ({ tasks, projects, goals, onUpdateReview, setReviews }) => {
    const [currentCadence, setCurrentCadence] = useState<ReviewCadence>('Daily');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentReview, setCurrentReview] = useState<Review | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isGoalLinkerOpen, setIsGoalLinkerOpen] = useState(false);

    const fetchReviewForPeriod = useCallback(async (cadence: ReviewCadence, date: Date) => {
        setIsLoading(true);
        setError(null);
        const period = getPeriodId(cadence, date);
        try {
            // Create a new review object for this period
            const reviewData: Review = {
                id: `${cadence}-${period}`,
                cadence,
                period,
                prompts: {},
                aiInsight: '',
                aiAdjustment: '',
                isCompleted: false,
                completedAt: null,
                linkedGoalIds: [],
            };
            
            setReviews(prev => {
                const exists = prev.some(r => r.id === reviewData.id);
                return exists ? prev.map(r => r.id === reviewData.id ? reviewData : r) : [...prev, reviewData];
            });
            setCurrentReview(reviewData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [setReviews]);

    useEffect(() => {
        fetchReviewForPeriod(currentCadence, currentDate);
    }, [currentCadence, currentDate, fetchReviewForPeriod]);

    const handlePromptChange = (prompt: string, answer: string) => {
        if (!currentReview || currentReview.isCompleted) return;
        setCurrentReview(prev => prev ? ({ ...prev, prompts: { ...prev.prompts, [prompt]: answer } }) : null);
    };

    const handleSavePrompts = async () => {
        if (!currentReview || currentReview.isCompleted) return;
        await onUpdateReview(currentReview);
    };

    const handleInsightReceived = (insight: string, adjustment: string) => {
        setCurrentReview(prev => prev ? ({ ...prev, aiInsight: insight, aiAdjustment: adjustment }) : null);
    };

    const handleCompleteReview = async () => {
        if (!currentReview) return;
        const finalReview = {
            ...currentReview,
            isCompleted: true,
            completedAt: new Date().toISOString(),
        };
        const updated = await onUpdateReview(finalReview);
        setCurrentReview(updated);
        setShowConfirmation(false);
    };

    const handleGoalLinksUpdate = async (newGoalIds: string[]) => {
        if (!currentReview) return;
        const updatedReview = { ...currentReview, goalIds: newGoalIds };
        setCurrentReview(updatedReview);
        await onUpdateReview(updatedReview);
        setIsGoalLinkerOpen(false);
    };
    
    const navigatePeriod = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }
        
        const newDate = new Date(currentDate);
        const increment = direction === 'prev' ? -1 : 1;
        
        switch (currentCadence) {
            case 'Daily': newDate.setDate(newDate.getDate() + 1 * increment); break;
            case 'Weekly': newDate.setDate(newDate.getDate() + 7 * increment); break;
            case 'Monthly': newDate.setMonth(newDate.getMonth() + 1 * increment); break;
            case 'Quarterly': newDate.setMonth(newDate.getMonth() + 3 * increment); break;
            case 'Annual': newDate.setFullYear(newDate.getFullYear() + 1 * increment); break;
        }
        setCurrentDate(newDate);
    };

    const cadences: ReviewCadence[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];
    const allPrompts = currentReview ? REVIEW_PROMPTS[currentReview.cadence] : [];
    const relevantCadencesForGoals: ReviewCadence[] = ['Monthly', 'Quarterly', 'Annual'];

    const renderContent = () => {
        if (isLoading) return <p className="text-center text-slate-500 dark:text-slate-400">Loading Review...</p>;
        if (error) return <p className="text-center text-red-500 dark:text-red-400">Error: {error}</p>;
        if (!currentReview) return <p className="text-center text-slate-500">Could not load review for this period.</p>;

        const linkedGoals = (currentReview.goalIds || [])
            .map(id => goals.find(g => g.id === id))
            .filter((g): g is Goal => !!g);

        return (
            <>
                <ReviewFunnel tasks={tasks} projects={projects} goals={goals} cadence={currentReview.cadence} />
                
                {relevantCadencesForGoals.includes(currentReview.cadence) && (
                    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <TargetIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
                                <h2 className="text-xl font-bold">Linked Goals</h2>
                            </div>
                            {!currentReview.isCompleted && (
                                <button 
                                    onClick={() => setIsGoalLinkerOpen(true)}
                                    className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                >
                                    <PencilIcon className="h-4 w-4 mr-1"/>
                                    {linkedGoals.length > 0 ? 'Edit' : 'Link Goals'}
                                </button>
                            )}
                        </div>
                        {linkedGoals.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {linkedGoals.map(goal => (
                                    <span key={goal.id} className="inline-block bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-sm font-medium px-3 py-1 rounded-full">
                                        {goal.title}
                                    </span>
                                ))}
                            </div>
                        ) : (
                             <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                               {currentReview.isCompleted ? 'No goals were linked to this review.' : 'Link goals to get more specific AI insights and track high-level progress.'}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Review Prompts</h2>
                        <div className="space-y-4">
                            {allPrompts.map(prompt => (
                                <div key={prompt}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{prompt}</label>
                                    <textarea
                                        value={currentReview.prompts[prompt] || ''}
                                        onChange={(e) => handlePromptChange(prompt, e.target.value)}
                                        onBlur={handleSavePrompts}
                                        rows={3}
                                        disabled={currentReview.isCompleted}
                                        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-70 disabled:bg-gray-100 dark:disabled:bg-slate-700/50"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <AIPoweredInsights
                        review={currentReview}
                        onInsightReceived={handleInsightReceived}
                        initialInsight={currentReview.aiInsight}
                        initialAdjustment={currentReview.aiAdjustment}
                        disabled={currentReview.isCompleted}
                    />
                </div>
                <div className="flex justify-center mt-8">
                    {currentReview.isCompleted ? (
                        <div className="text-center px-8 py-3 bg-gray-100 dark:bg-slate-700 rounded-full text-teal-600 dark:text-teal-300 font-bold">
                            Review Completed on {new Date(currentReview.completedAt!).toLocaleDateString()}
                        </div>
                    ) : (
                        <button onClick={() => setShowConfirmation(true)} className="bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105">
                            Complete {currentReview.cadence} Review
                        </button>
                    )}
                </div>
            </>
        );
    };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-center mb-4">
            <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex space-x-1">
                {cadences.map(c => (
                    <button key={c} onClick={() => setCurrentCadence(c)} className={`px-3 py-1 text-sm font-medium rounded-md capitalize ${currentCadence === c ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{c}</button>
                ))}
            </div>
        </div>
        <div className="flex justify-between items-center">
            <button onClick={() => navigatePeriod('prev')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-6 w-6" /></button>
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{currentCadence} Alignment Review</h1>
                <p className="text-slate-600 dark:text-slate-400 font-semibold">{getPeriodTitle(currentCadence, currentDate)}</p>
            </div>
            <button onClick={() => navigatePeriod('next')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-6 w-6" /></button>
        </div>
         <div className="text-center mt-2">
            <button onClick={() => navigatePeriod('today')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Go to Current Period</button>
        </div>
      </div>
      
      {renderContent()}

      {showConfirmation && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Finalize Review?</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Once completed, this review will be saved as a snapshot and cannot be edited. Are you sure you want to proceed?</p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => setShowConfirmation(false)} className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={handleCompleteReview} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">Yes, Complete It</button>
                </div>
            </div>
        </div>
      )}

      {isGoalLinkerOpen && currentReview && (
            <GoalLinkerModal
                allGoals={goals}
                linkedGoalIds={currentReview.goalIds || []}
                onClose={() => setIsGoalLinkerOpen(false)}
                onSave={handleGoalLinksUpdate}
            />
        )}
    </div>
  );
};

export default Reviews;