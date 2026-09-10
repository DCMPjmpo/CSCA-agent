const fs = require('fs');
const f = 'lib/i18n/translations.ts';
let c = fs.readFileSync(f, 'utf-8').replace(/\r\n/g, '\n');

// Find all locale mockExam blocks (skipping interface at line 99)
// Find each "  mockExam: {" and add missing fields before its closing "  },"

const newFields = `    selectSubjects: 'Select Subjects',
    questionProgress: 'Progress',
    remainingTime: 'Remaining Time',
    noTimeLimit: 'No Time Limit',
    submitExam: 'Submit Exam',
    examScore: 'Exam Score',
    questionsAnswered: 'Correct',
    questionsWrong: 'Wrong',
    easy: 'Easy',
    medium: 'Medium',
    difficult: 'Hard',
    essayQuestion: 'Essay Question',
    enterAnswer: 'Enter your answer',
    nextQuestion: 'Next',
    prevQuestion: 'Previous',
    correctAnswer: 'Correct Answer',
    yourAnswer: 'Your Answer',
    errorList: 'Error List',
    aiExplanation: 'AI Explanation',
    personalizedPlan: 'Personalized Plan',
    todayTasks: "Today's Tasks",
    weeklyGoals: 'Weekly Goals',
    universityMatchResult: 'University Match Result',
    currentScore: 'Current Score',
    commonQuestions: 'Common Questions',
    hotQuestions: 'Popular Questions',
    close: 'Close',
    deepAnalysis: 'Deep Analysis',
    personalAdvice: 'Personalized Advice',
    aiTutor: 'AI Tutor',
`;

// Find the interface mockExam (first occurrence, starts at line ~99)
// Then find all locale mockExams (after the interface)
const interfaceMockExam = c.indexOf('  mockExam: {');
const firstLocaleMock = c.indexOf('  mockExam: {', interfaceMockExam + 200);

// Search from first locale mockExam onward
let searchIdx = firstLocaleMock;
let count = 0;
while (true) {
  const mockStart = c.indexOf('  mockExam: {', searchIdx);
  if (mockStart === -1) break;

  // Find the closing "  }," of this mockExam block
  // It's followed by "  scoreAnalysis:" or another section
  const mockClose = c.indexOf('\n  },\n  scoreAnalysis:', mockStart);
  if (mockClose === -1) { searchIdx = mockStart + 1; continue; }

  // Check if it already has selectSubjects (skip already-fixed locales like en)
  const block = c.slice(mockStart, mockClose);
  if (block.includes('selectSubjects:')) {
    searchIdx = mockClose + 1;
    continue;
  }

  // Insert before the closing "  },"
  const before = c.slice(0, mockClose + 1);
  const after = c.slice(mockClose + 1);

  c = before + '\n' + newFields + after;
  count++;
  searchIdx = mockClose + 1;
}

fs.writeFileSync(f, c, 'utf-8');
console.log('Added fields to ' + count + ' mockExam blocks');
