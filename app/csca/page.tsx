"use client";

import { useState, useEffect } from "react";

// ###########################
// 这里我删除了所有报错的 import！
// ###########################

export default function CSCAExamPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
    const [isExamFinished, setIsExamFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 自带模拟题，不依赖外部文件
    useEffect(() => {
        const demoQuestions = [
            {
                id: "1",
                question: "下列词语中，书写完全正确的一项是？",
                options: ["迫不急待", "再接再厉", "一愁莫展", "谈笑风声"],
                correctAnswer: 1,
                subject: "基础汉语",
                module: "词汇",
            },
        ];
        setQuestions(demoQuestions);
        setLoading(false);
    }, []);

    const handleAnswerSelect = (questionId: string, answerIndex: number) => {
        setUserAnswers((prev) => ({
            ...prev,
            [questionId]: answerIndex,
        }));
    };

    const handleSubmit = () => {
        setIsExamFinished(true);
        let calculatedScore = 0;
        const wrongList: any[] = [];

        questions.forEach((q) => {
            const userAns = userAnswers[q.id];
            if (userAns === q.correctAnswer) {
                calculatedScore += 1;
            } else {
                wrongList.push(q);
            }
        });

        setScore(calculatedScore);
        setWrongQuestions(wrongList);
    };

    if (loading) {
        return <div className="p-8 text-center">加载中...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">CSCA 模拟考试</h1>

            <div className="space-y-8 mb-10">
                {questions.map((q, index) => (
                    <div key={q.id} className="p-5 border rounded-lg">
                        <h3 className="font-medium mb-3">
                            {index + 1}. {q.question}
                        </h3>
                        <div className="grid gap-2">
                            {q.options.map((opt: string, optIndex: number) => (
                                <button
                                    key={optIndex}
                                    onClick={() => handleAnswerSelect(q.id, optIndex)}
                                    className={`p-2 border rounded text-left ${userAnswers[q.id] === optIndex
                                            ? "bg-blue-100 border-blue-500"
                                            : "bg-white"
                                        }`}
                                    disabled={isExamFinished}
                                >
                                    {String.fromCharCode(65 + optIndex)}. {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {!isExamFinished ? (
                <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    提交试卷
                </button>
            ) : (
                <div className="p-5 border rounded-lg bg-green-50">
                    <h2 className="text-xl font-bold mb-2">
                        考试完成！得分：{score}/{questions.length}
                    </h2>
                    <p>错题数量：{wrongQuestions.length}</p>
                </div>
            )}
        </div>
    );
}