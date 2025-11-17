import React, { useState } from 'react';
import { Review } from '../types';
import { StarIcon } from './icons';

interface AIPoweredInsightsProps {
  review: Review;
  onInsightReceived: (insight: string, adjustment: string) => void;
  initialInsight: string | null;
  initialAdjustment: string | null;
  disabled?: boolean;
}

const AIPoweredInsights: React.FC<AIPoweredInsightsProps> = ({ 
    review, onInsightReceived, initialInsight, initialAdjustment, disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBeenGenerated = !!initialInsight;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the public Gemini API endpoint without auth
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Based on the following review responses, provide AI-powered insights and suggested adjustments:\n\nReview Prompts and Answers:\n${JSON.stringify(review.prompts, null, 2)}\n\nProvide your response in JSON format with "insight" and "adjustment" fields.`
            }]
          }]
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate insights from Gemini API.');
      }
      
      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('No content received from Gemini API');
      }
      
      try {
        const parsed = JSON.parse(textContent);
        onInsightReceived(parsed.insight || '', parsed.adjustment || '');
      } catch {
        // If not JSON, use the raw text
        onInsightReceived(textContent, '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Insights & Adjustments (AI-Powered)</h2>
      
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
                <StarIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400 animate-spin mx-auto" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">Analyzing your progress...</p>
            </div>
        </div>
      ) : error ? (
        <div className="flex-grow flex items-center justify-center p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      ) : hasBeenGenerated ? (
        <div className="space-y-4 flex-grow">
            <div>
                <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">Insight:</h3>
                <p className="text-slate-800 dark:text-slate-200">{initialInsight}</p>
            </div>
            <div>
                <h3 className="font-semibold text-teal-700 dark:text-teal-300">Adjustment:</h3>
                <p className="text-slate-800 dark:text-slate-200">{initialAdjustment}</p>
            </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-center">
            <div>
                <p className="text-slate-500 dark:text-slate-400">Complete your review prompts and generate AI-powered feedback to find patterns and optimize your actions.</p>
            </div>
        </div>
      )}

      <button 
        onClick={handleGenerate} 
        disabled={isLoading || disabled}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Generating...' : hasBeenGenerated ? 'Regenerate Insights' : 'Generate Insights'}
      </button>
    </div>
  );
};

export default AIPoweredInsights;