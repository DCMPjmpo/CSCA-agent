/**
 * Exercise Panel Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

interface ExercisePanelProps {
  knowledgeMap?: any;
  onComplete?: () => void;
}

interface Exercise {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export function ExercisePanel({ knowledgeMap, onComplete }: ExercisePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleGenerate = async () => {
    if (!knowledgeMap) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/csca/adaptive-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeMap,
          count: 5,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExercises(data.data);
        setCurrentIndex(0);
        setSelectedAnswer('');
        setShowResult(false);
        setScore(0);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setShowResult(true);
    if (selectedAnswer === exercises[currentIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      onComplete?.();
    }
  };

  const currentExercise = exercises[currentIndex];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 3: Adaptive Exercises</CardTitle>
        <p className="text-sm text-gray-500">
          Practice questions tailored to your weak areas
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {exercises.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Exercises will be generated based on your knowledge map, focusing on weak topics.
              </p>
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={isLoading || !knowledgeMap}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Exercises'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Progress</span>
                <span className="font-medium">
                  {currentIndex + 1} / {exercises.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Score</span>
                <span className="font-bold text-green-600">{score}</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {currentExercise?.subject}
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                  {currentExercise?.topic}
                </span>
                <span className="text-xs text-gray-500">
                  Difficulty: {Math.round(currentExercise?.difficulty * 100)}%
                </span>
              </div>
              <p className="text-lg font-medium">{currentExercise?.question}</p>
            </div>

            <div className="space-y-2">
              {currentExercise?.options.map((option: string) => {
                const optionLabel = option.charAt(0);
                const isSelected = selectedAnswer === optionLabel;
                const isCorrect = optionLabel === currentExercise?.correctAnswer;
                let bgClass = 'bg-gray-100 hover:bg-gray-200';

                if (showResult) {
                  if (isCorrect) {
                    bgClass = 'bg-green-100 border-green-400';
                  } else if (isSelected && !isCorrect) {
                    bgClass = 'bg-red-100 border-red-400';
                  } else {
                    bgClass = 'bg-gray-100 opacity-50';
                  }
                } else if (isSelected) {
                  bgClass = 'bg-blue-100 border-blue-400';
                }

                return (
                  <button
                    key={option}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${bgClass}`}
                    onClick={() => handleSelectAnswer(optionLabel)}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                        showResult && isCorrect ? 'bg-green-500 text-white' :
                        showResult && isSelected ? 'bg-red-500 text-white' :
                        isSelected ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {optionLabel}
                      </span>
                      <span>{option.slice(3)}</span>
                      {showResult && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-amber-700">Explanation</span>
                </div>
                <p className="text-sm text-amber-800">{currentExercise?.explanation}</p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={showResult ? handleNext : handleSubmit}
              disabled={!showResult && !selectedAnswer}
            >
              {showResult
                ? currentIndex === exercises.length - 1
                  ? 'Complete'
                  : 'Next Question'
                : 'Submit Answer'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
