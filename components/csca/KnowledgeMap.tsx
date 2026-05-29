/**
 * Knowledge Map Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KnowledgeMapProps {
  subject?: string;
  nationality?: string;
  onComplete?: (data: KnowledgeMapResult) => void;
}

interface KnowledgeMapResult {
  subject: string;
  topics: Array<{
    name: string;
    description: string;
    mastery: 'mastered' | 'needs_review' | 'weak';
    eloScore: number;
  }>;
}

const MASTERY_COLORS = {
  mastered: 'bg-green-100 text-green-700 border-green-200',
  needs_review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  weak: 'bg-red-100 text-red-700 border-red-200',
};

const MASTERY_LABELS = {
  mastered: 'Mastered',
  needs_review: 'Needs Review',
  weak: 'Weak',
};

const MASTERY_ICONS = {
  mastered: TrendingUp,
  needs_review: Minus,
  weak: TrendingDown,
};

export function KnowledgeMap({ subject: initialSubject, nationality, onComplete }: KnowledgeMapProps) {
  const [subject, setSubject] = useState(initialSubject || 'Mathematics');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<KnowledgeMapResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/csca/knowledge-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          nationality,
          highSchoolSystem: 'IB',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onComplete?.(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge map:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const weakTopics = result?.topics.filter(t => t.mastery === 'weak').length || 0;
  const needsReviewTopics = result?.topics.filter(t => t.mastery === 'needs_review').length || 0;
  const masteredTopics = result?.topics.filter(t => t.mastery === 'mastered').length || 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 2: Knowledge Map</CardTitle>
        <p className="text-sm text-gray-500">
          Identify your knowledge strengths and weaknesses
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Knowledge Map'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <TrendingDown className="w-6 h-6 mx-auto text-red-500 mb-1" />
                <div className="text-2xl font-bold text-red-600">{weakTopics}</div>
                <div className="text-xs text-gray-500">Weak</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <Minus className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                <div className="text-2xl font-bold text-yellow-600">{needsReviewTopics}</div>
                <div className="text-xs text-gray-500">Needs Review</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <div className="text-2xl font-bold text-green-600">{masteredTopics}</div>
                <div className="text-xs text-gray-500">Mastered</div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {result.topics.map((topic, index) => {
                const Icon = MASTERY_ICONS[topic.mastery];
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${MASTERY_COLORS[topic.mastery]}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-medium">{topic.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-75">ELO: {topic.eloScore}</span>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-sm mt-1 opacity-75">{topic.description}</p>
                  </div>
                );
              })}
            </div>

            <Button className="w-full" onClick={() => setResult(null)}>
              Generate for Another Subject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
