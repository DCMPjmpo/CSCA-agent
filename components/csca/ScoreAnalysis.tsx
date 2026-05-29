/**
 * Score Analysis Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

interface ScoreAnalysisProps {
  score?: number;
  subject?: string;
  nationality?: string;
  onComplete?: () => void;
}

interface ScoreAnalysisResult {
  totalScore: number;
  moduleScores: Record<string, number>;
  rankingPercentile: number;
  weakPoints: string[];
  improvementPlan: string;
}

export function ScoreAnalysis({ score: initialScore, subject, nationality, onComplete }: ScoreAnalysisProps) {
  const [score, setScore] = useState(initialScore || 70);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScoreAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/csca/score-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockExam: {
            subject: subject || 'Mathematics',
            questions: Array(10).fill({ id: 'q1', module: 'Module A', correctAnswer: 'A' }),
            answers: {},
          },
          nationality,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          ...data.data,
          totalScore: score,
        });
      }
    } catch (err) {
      console.error('Failed to fetch score analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 5: Score Analysis</CardTitle>
        <p className="text-sm text-gray-500">
          Get detailed analysis of your performance and improvement suggestions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Your Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button className="w-full" onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Score'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-6 rounded-lg ${getScoreBg(result.totalScore)} text-center`}>
              <div className={`text-6xl font-bold ${getScoreColor(result.totalScore)}`}>
                {result.totalScore}
              </div>
              <div className="text-gray-600 mt-1">Total Score</div>
              <div className="text-sm mt-2">
                {result.totalScore >= 60 ? (
                  <span className="text-green-600">✓ Passing Score</span>
                ) : (
                  <span className="text-red-600">✗ Below passing (60)</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">Ranking Percentile</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">{result.rankingPercentile}%</div>
                <div className="text-xs text-gray-500">Compared to candidates</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium">Weak Areas</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">{result.weakPoints.length}</div>
                <div className="text-xs text-gray-500">Needs improvement</div>
              </div>
            </div>

            {result.moduleScores && (
              <div className="space-y-2">
                <h4 className="font-medium">Module Performance</h4>
                {Object.entries(result.moduleScores).map(([module, score]) => (
                  <div key={module} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{module}</span>
                      <span className={getScoreColor(score)}>{score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.weakPoints && result.weakPoints.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-700">Weak Points</span>
                </div>
                <ul className="space-y-1">
                  {result.weakPoints.map((point, index) => (
                    <li key={index} className="text-sm text-red-600">
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">Improvement Plan</h4>
              <p className="text-sm text-green-600 whitespace-pre-line">{result.improvementPlan}</p>
            </div>

            <Button className="w-full" onClick={onComplete}>
              Continue to University Matching
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
