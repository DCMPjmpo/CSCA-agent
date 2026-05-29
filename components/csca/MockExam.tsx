/**
 * Mock Exam Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';

interface MockExamProps {
  subject?: string;
  onComplete?: (score: number) => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  module: string;
  difficulty: string;
}

interface MockExamResult {
  id: string;
  subject: string;
  questions: Question[];
  duration: number;
  totalQuestions: number;
}

export function MockExam({ subject: initialSubject, onComplete }: MockExamProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(initialSubject || 'Mathematics');
  const [isLoading, setIsLoading] = useState(false);
  const [exam, setExam] = useState<MockExamResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds

  const handleGenerate = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/csca/mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          totalQuestions: 10, // Reduced for demo
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExam(data.data);
        setAnswers({});
        setIsSubmitted(false);
        setTimeLeft(data.data.duration * 60);
      }
    } catch (err) {
      console.error('Failed to fetch mock exam:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const correctCount = exam?.questions.filter(q => answers[q.id] === q.correctAnswer).length || 0;
    const score = Math.round((correctCount / (exam?.questions.length || 1)) * 100);
    onComplete?.(score);
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = exam?.questions.filter(q => answers[q.id] === q.correctAnswer).length || 0;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 4: {t.mockExam.title}</CardTitle>
        <p className="text-sm text-gray-500">
          {t.mockExam.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!exam ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.knowledgeMap.selectSubject}</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder={t.knowledgeMap.selectSubject} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                t.mockExam.start
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className={`font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-blue-600'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {t.mockExam.answered}: <span className="font-medium">{answeredCount}</span> / {exam.questions.length}
                </span>
                {isSubmitted && (
                  <span className="text-sm text-green-600">
                    {t.mockExam.correct}: <span className="font-bold">{correctCount}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {exam.questions.map((question, index) => {
                const selectedAnswer = answers[question.id];
                const isCorrect = selectedAnswer === question.correctAnswer;

                return (
                  <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            {question.module}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {question.difficulty}
                          </span>
                        </div>
                        <p className="font-medium mb-3">{question.question}</p>
                        <div className="space-y-2">
                          {question.options.map((option) => {
                            const optionLabel = option.charAt(0);
                            const isSelected = selectedAnswer === optionLabel;
                            let bgClass = 'border-gray-200 hover:border-gray-300';

                            if (isSubmitted) {
                              if (optionLabel === question.correctAnswer) {
                                bgClass = 'border-green-500 bg-green-50';
                              } else if (isSelected && !isCorrect) {
                                bgClass = 'border-red-500 bg-red-50';
                              } else {
                                bgClass = 'border-gray-200 opacity-50';
                              }
                            } else if (isSelected) {
                              bgClass = 'border-blue-500 bg-blue-50';
                            }

                            return (
                              <button
                                key={option}
                                className={`w-full p-2 rounded-lg border-2 text-left transition-colors ${bgClass}`}
                                onClick={() => !isSubmitted && handleAnswer(question.id, optionLabel)}
                                disabled={isSubmitted}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                    isSubmitted && optionLabel === question.correctAnswer ? 'bg-green-500 text-white' :
                                    isSubmitted && isSelected ? 'bg-red-500 text-white' :
                                    isSelected ? 'bg-blue-500 text-white' :
                                    'bg-gray-200 text-gray-600'
                                  }`}>
                                    {optionLabel}
                                  </span>
                                  <span>{option.slice(3)}</span>
                                  {isSubmitted && optionLabel === question.correctAnswer && (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isSubmitted ? (
              <Button className="w-full" onClick={handleSubmit}>
                {t.mockExam.submit}
              </Button>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="font-bold text-green-700">{t.mockExam.completed}</h3>
                <p className="text-lg">
                  {t.scoreAnalysis.totalScore}: <span className="font-bold text-2xl">{Math.round((correctCount / exam.questions.length) * 100)}</span>/100
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
