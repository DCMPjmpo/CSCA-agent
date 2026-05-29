/**
 * Diagnosis Panel Component - CSCA Pilot Agent
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';

interface DiagnosisPanelProps {
  onComplete?: (data: DiagnosisResult) => void;
}

interface DiagnosisResult {
  requiredSubjects: string[];
  recommendedSubjects: string[];
  subjectPriorities: Record<string, number>;
  estimatedDays: number;
}

export function DiagnosisPanel({ onComplete }: DiagnosisPanelProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    targetMajor: '',
    highSchoolSystem: 'IB',
    hskLevel: '4',
    nationality: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.targetMajor || !formData.nationality) {
      setError(t.common.error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/csca/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMajor: formData.targetMajor,
          highSchoolSystem: formData.highSchoolSystem,
          hskLevel: parseInt(formData.hskLevel),
          nationality: formData.nationality,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onComplete?.(data.data);
      } else {
        setError(data.error || t.common.error);
      }
    } catch (err) {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Step 1: {t.diagnosis.title}</CardTitle>
        <p className="text-sm text-gray-500">
          {t.diagnosis.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetMajor">{t.diagnosis.targetMajor}</Label>
              <Input
                id="targetMajor"
                placeholder={t.diagnosis.targetMajor}
                value={formData.targetMajor}
                onChange={(e) => setFormData({ ...formData, targetMajor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">{t.diagnosis.nationality}</Label>
              <Select
                value={formData.nationality}
                onValueChange={(value) => setFormData({ ...formData, nationality: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.diagnosis.nationality} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Thailand">Thailand</SelectItem>
                  <SelectItem value="Vietnam">Vietnam</SelectItem>
                  <SelectItem value="Indonesia">Indonesia</SelectItem>
                  <SelectItem value="Philippines">Philippines</SelectItem>
                  <SelectItem value="Malaysia">Malaysia</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highSchoolSystem">{t.diagnosis.highSchoolSystem}</Label>
              <Select
                value={formData.highSchoolSystem}
                onValueChange={(value) => setFormData({ ...formData, highSchoolSystem: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.diagnosis.highSchoolSystem} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IB">International Baccalaureate (IB)</SelectItem>
                  <SelectItem value="A-Level">A-Level</SelectItem>
                  <SelectItem value="AP">Advanced Placement (AP)</SelectItem>
                  <SelectItem value="National">National Curriculum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hskLevel">{t.diagnosis.hskLevel}</Label>
              <Select
                value={formData.hskLevel}
                onValueChange={(value) => setFormData({ ...formData, hskLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.diagnosis.hskLevel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">HSK 1</SelectItem>
                  <SelectItem value="2">HSK 2</SelectItem>
                  <SelectItem value="3">HSK 3</SelectItem>
                  <SelectItem value="4">HSK 4</SelectItem>
                  <SelectItem value="5">HSK 5</SelectItem>
                  <SelectItem value="6">HSK 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                t.diagnosis.start
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">{t.diagnosis.resultTitle}</span>
            </div>

            <div>
              <h4 className="font-medium mb-2">{t.diagnosis.requiredSubjects}:</h4>
              <div className="flex flex-wrap gap-2">
                {result.requiredSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            {result.recommendedSubjects && result.recommendedSubjects.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">{t.diagnosis.recommendedSubjects}:</h4>
                <div className="flex flex-wrap gap-2">
                  {result.recommendedSubjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium mb-1">{t.diagnosis.estimatedDays}</h4>
              <p className="text-2xl font-bold text-yellow-700">{result.estimatedDays} {t.flow.daysUnit}</p>
            </div>

            <Button className="w-full" onClick={() => setResult(null)}>
              {t.common.back}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
