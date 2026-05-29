'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuditResult {
  id: string;
  question: string;
  fixedQuestion: string;
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestion: string;
  module: string;
  subject: string;
}

interface AuditStats {
  total: number;
  valid: number;
  invalid: number;
  avgConfidence: number;
}

export default function AuditPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<AuditResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchAuditResults();
  }, []);

  const fetchAuditResults = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/csca/audit-questions?limit=200');
      const data = await response.json();
      if (data.success) {
        setAuditResults(data.data.detailedResults);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch audit results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = auditResults.filter(r => {
    if (filter === 'valid') return r.isValid;
    if (filter === 'invalid') return !r.isValid;
    return true;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBadge = (isValid: boolean) => {
    return isValid ? (
      <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
        ✅ 有效
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full">
        ❌ 无效
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">题库审核</h1>
          <p className="text-slate-400 mt-1">检查题库中题目的质量，确保题目格式正确</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          返回
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">题目总数</div>
          </div>
          <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/50">
            <div className="text-3xl font-bold text-green-400">{stats.valid}</div>
            <div className="text-green-300/70 text-sm">有效题目</div>
          </div>
          <div className="bg-red-900/30 rounded-xl p-4 border border-red-700/50">
            <div className="text-3xl font-bold text-red-400">{stats.invalid}</div>
            <div className="text-red-300/70 text-sm">无效题目</div>
          </div>
          <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-700/50">
            <div className="text-3xl font-bold text-indigo-400">{(stats.avgConfidence * 100).toFixed(0)}%</div>
            <div className="text-indigo-300/70 text-sm">平均置信度</div>
          </div>
        </div>
      )}

      {/* 过滤按钮 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          全部 ({auditResults.length})
        </button>
        <button
          onClick={() => setFilter('valid')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'valid'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ✅ 有效 ({auditResults.filter(r => r.isValid).length})
        </button>
        <button
          onClick={() => setFilter('invalid')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'invalid'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ❌ 无效 ({auditResults.filter(r => !r.isValid).length})
        </button>
      </div>

      {/* 题目列表 */}
      <div className="grid gap-4">
        {filteredResults.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-4">📋</div>
            <p>暂无符合条件的题目</p>
          </div>
        ) : (
          filteredResults.map((result, index) => (
            <div
              key={result.id}
              onClick={() => setSelectedQuestion(result)}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                result.isValid
                  ? 'bg-slate-800/50 border-slate-700 hover:border-green-500/50'
                  : 'bg-red-900/10 border-red-700/30 hover:border-red-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-500 text-sm">#{index + 1}</span>
                    {getStatusBadge(result.isValid)}
                    <span className="text-slate-500 text-xs">{result.subject}</span>
                    <span className="text-slate-500 text-xs">{result.module}</span>
                    <span className={`text-xs ${getConfidenceColor(result.confidence)}`}>
                      置信度: {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-white text-sm line-clamp-2">{result.question}</p>
                  {!result.isValid && result.issues.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.issues.map((issue, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedQuestion && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedQuestion(null)}
        >
          <div
            className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedQuestion.isValid)}
                  <span className="text-slate-400 text-sm">{selectedQuestion.subject} - {selectedQuestion.module}</span>
                </div>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="p-2 rounded-lg hover:bg-slate-700"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-slate-400 text-sm mb-2">原始题目</h3>
                <p className="text-white bg-slate-700/50 rounded-lg p-4">
                  {selectedQuestion.question}
                </p>
              </div>
              {selectedQuestion.fixedQuestion !== selectedQuestion.question && (
                <div className="mb-6">
                  <h3 className="text-green-400 text-sm mb-2">清理后题目</h3>
                  <p className="text-white bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                    {selectedQuestion.fixedQuestion}
                  </p>
                </div>
              )}
              {!selectedQuestion.isValid && selectedQuestion.issues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-red-400 text-sm mb-2">问题列表</h3>
                  <ul className="space-y-2">
                    {selectedQuestion.issues.map((issue, i) => (
                      <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedQuestion.suggestion && (
                <div>
                  <h3 className="text-indigo-400 text-sm mb-2">改进建议</h3>
                  <p className="text-slate-300 text-sm bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-4">
                    {selectedQuestion.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
