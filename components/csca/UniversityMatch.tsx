/**
 * University Matching Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Award, MapPin, TrendingUp, Target, AlertTriangle } from 'lucide-react';

interface UniversityMatchProps {
  score?: number;
  targetMajor?: string;
  nationality?: string;
}

interface UniversityMatchResult {
  safeSchools: Array<{ name: string; location: string; probability: number }>;
  targetSchools: Array<{ name: string; location: string; probability: number }>;
  reachSchools: Array<{ name: string; location: string; probability: number }>;
  scholarships: Array<{ name: string; description: string; requirements: string[] }>;
}

export function UniversityMatch({ score, targetMajor: initialMajor, nationality }: UniversityMatchProps) {
  const [targetMajor, setTargetMajor] = useState(initialMajor || 'Computer Science');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UniversityMatchResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/csca/university-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreAnalysis: { totalScore: score || 70 },
          targetMajor,
          nationality,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch university match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600 bg-green-100';
    if (probability >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 0.7) return <TrendingUp className="w-4 h-4" />;
    if (probability >= 0.4) return <Target className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 6: University Matching</CardTitle>
        <p className="text-sm text-gray-500">
          Find your ideal Chinese universities based on your profile
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Major</label>
              <Select value={targetMajor} onValueChange={setTargetMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select major" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Medicine">Medicine</SelectItem>
                  <SelectItem value="Economics">Economics</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {score && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Using estimated CSCA score: <span className="font-bold">{score}/100</span>
                </p>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Matching...
                </>
              ) : (
                'Find Universities'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Safe Schools (High Probability)</h3>
              </div>
              <div className="space-y-2">
                {result.safeSchools.map((school, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium">{school.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProbabilityColor(school.probability)}`}>
                        {getProbabilityIcon(school.probability)}
                        {Math.round(school.probability * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {school.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">Target Schools (Medium Probability)</h3>
              </div>
              <div className="space-y-2">
                {result.targetSchools.map((school, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium">{school.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProbabilityColor(school.probability)}`}>
                        {getProbabilityIcon(school.probability)}
                        {Math.round(school.probability * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {school.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold">Reach Schools (Low Probability)</h3>
              </div>
              <div className="space-y-2">
                {result.reachSchools.map((school, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-red-600" />
                        <span className="font-medium">{school.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProbabilityColor(school.probability)}`}>
                        {getProbabilityIcon(school.probability)}
                        {Math.round(school.probability * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {school.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.scholarships && result.scholarships.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold">Available Scholarships</h3>
                </div>
                <div className="space-y-2">
                  {result.scholarships.map((scholarship, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">{scholarship.name}</h4>
                      <p className="text-sm text-purple-600 mt-1">{scholarship.description}</p>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-purple-700">Requirements:</span>
                        <ul className="text-xs text-purple-600 mt-1 space-y-1">
                          {scholarship.requirements.map((req, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span>•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => setResult(null)}>
              Reset and Re-match
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
