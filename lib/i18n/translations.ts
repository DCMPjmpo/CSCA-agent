/**
 * CSCA Pilot Agent - Multi-language Support
 * Supported: English, Thai, Vietnamese, Indonesian, Chinese
 */

export interface Translations {
  nav: {
    tagline: string;
    framework: string;
    home: string;
    caseStudy: string;
    aiAssistant: string;
    classroom: string;
    prepCenter: string;
  };
  flow: {
    errorReview: string;
    studyPlan: string;
    restart: string;
    daysUnit: string;
    aseanCountries: string;
    candidateInfo: string;
    examNotes: string;
    languageHint: string;
  };
  common: {
    welcome: string;
    next: string;
    back: string;
    complete: string;
    loading: string;
    error: string;
    success: string;
  };
  diagnosis: {
    title: string;
    description: string;
    targetMajor: string;
    nationality: string;
    highSchoolSystem: string;
    hskLevel: string;
    start: string;
    resultTitle: string;
    requiredSubjects: string;
    recommendedSubjects: string;
    estimatedDays: string;
  };
  knowledgeMap: {
    title: string;
    description: string;
    selectSubject: string;
    generate: string;
    weak: string;
    needsReview: string;
    mastered: string;
  };
  adaptiveLearning: {
    title: string;
    description: string;
    generate: string;
    question: string;
    options: string;
    answer: string;
    explanation: string;
    submit: string;
    next: string;
  };
  mockExam: {
    title: string;
    description: string;
    start: string;
    time: string;
    answered: string;
    correct: string;
    submit: string;
    completed: string;
    examMode: string;
    fullMode: string;
    practiceMode: string;
    fullDescription: string;
    practiceDescription: string;
    examNotes: string;
    fullDetails: string;
    practiceDetails: string;
    resultReview: string;
    studyPlanAuto: string;
  };
  scoreAnalysis: {
    title: string;
    description: string;
    analyze: string;
    totalScore: string;
    percentile: string;
    weakPoints: string;
    improvement: string;
    passing: string;
    belowPassing: string;
  };
  universityMatch: {
    title: string;
    description: string;
    selectMajor: string;
    find: string;
    safeSchools: string;
    targetSchools: string;
    reachSchools: string;
    scholarships: string;
    probability: string;
  };
  steps: {
    diagnosis: string;
    knowledgeMap: string;
    adaptiveLearning: string;
    mockExam: string;
    scoreAnalysis: string;
    universityMatch: string;
  };
}

export const en: Translations = {
  nav: {
    tagline: 'ASEAN Full Learning Path',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'Home',
    caseStudy: 'Student Stories',
    aiAssistant: 'AI Assistant',
    classroom: 'OpenMAIC Classroom',
    prepCenter: 'Prep Hub',
  },
  flow: {
    errorReview: 'Error Review',
    studyPlan: 'Study Plan',
    restart: 'Start Over',
    daysUnit: 'days',
    aseanCountries: 'ASEAN Country',
    candidateInfo: 'Your Profile',
    examNotes: 'Exam Guidelines',
    languageHint: 'Fluent in Chinese? Switch to 简体中文 in the top-right corner.',
  },
  common: {
    welcome: 'Welcome to CSCA Pilot Agent',
    next: 'Next',
    back: 'Back',
    complete: 'Complete',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success!',
  },
  diagnosis: {
    title: 'Subject Diagnosis',
    description: 'Tell us about your study plan and we will recommend subjects for the CSCA exam',
    targetMajor: 'Target Major *',
    nationality: 'Nationality *',
    highSchoolSystem: 'High School System',
    hskLevel: 'HSK Level',
    start: 'Start Diagnosis',
    resultTitle: 'Diagnosis Complete!',
    requiredSubjects: 'Required Subjects',
    recommendedSubjects: 'Recommended Subjects',
    estimatedDays: 'Recommended Preparation Time',
  },
  knowledgeMap: {
    title: 'Knowledge Map',
    description: 'Identify your knowledge strengths and weaknesses',
    selectSubject: 'Select Subject',
    generate: 'Generate Knowledge Map',
    weak: 'Weak',
    needsReview: 'Needs Review',
    mastered: 'Mastered',
  },
  adaptiveLearning: {
    title: 'Adaptive Exercises',
    description: 'Practice questions tailored to your weak areas',
    generate: 'Generate Exercises',
    question: 'Question',
    options: 'Options',
    answer: 'Answer',
    explanation: 'Explanation',
    submit: 'Submit Answer',
    next: 'Next Question',
  },
  mockExam: {
    title: 'Mock Exam',
    description: 'Complete a full CSCA-style mock exam to assess your readiness',
    start: 'Start Exam',
    time: 'Time',
    answered: 'Answered',
    correct: 'Correct',
    submit: 'Submit Exam',
    completed: 'Exam Completed!',
    examMode: 'Exam Mode',
    fullMode: 'Full Mode',
    practiceMode: 'Practice Mode',
    fullDescription: 'Same number of questions and time as the official exam',
    practiceDescription: 'Fewer questions, suitable for quick practice',
    examNotes: 'Exam Notes',
    fullDetails: 'Science Chinese: 80 questions/90 mins, Math: 60 questions/90 mins',
    practiceDetails: '10 questions per subject, no time limit',
    resultReview: 'View incorrect answers and AI explanations after exam',
    studyPlanAuto: 'System will automatically generate personalized study plan',
  },
  scoreAnalysis: {
    title: 'Score Analysis',
    description: 'Get detailed analysis of your performance and improvement suggestions',
    analyze: 'Analyze Score',
    totalScore: 'Total Score',
    percentile: 'Ranking Percentile',
    weakPoints: 'Weak Points',
    improvement: 'Improvement Plan',
    passing: '✓ Passing Score',
    belowPassing: '✗ Below passing (60)',
  },
  universityMatch: {
    title: 'University Matching',
    description: 'Find your ideal Chinese universities based on your profile',
    selectMajor: 'Target Major',
    find: 'Find Universities',
    safeSchools: 'Safe Schools',
    targetSchools: 'Target Schools',
    reachSchools: 'Reach Schools',
    scholarships: 'Available Scholarships',
    probability: 'Probability',
  },
  steps: {
    diagnosis: 'Diagnosis',
    knowledgeMap: 'Knowledge Map',
    adaptiveLearning: 'Adaptive Learning',
    mockExam: 'Mock Exam',
    scoreAnalysis: 'Score Analysis',
    universityMatch: 'University Match',
  },
};

export const th: Translations = {
  nav: {
    tagline: 'เส้นทางการเรียนรู้ ASEAN แบบครบวงจร',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'หน้าแรก',
    caseStudy: 'กรณีศึกษานักเรียน',
    aiAssistant: 'ผู้ช่วย AI',
    classroom: 'ห้องเรียน OpenMAIC',
    prepCenter: 'ศูนย์เตรียมสอบ',
  },
  flow: {
    errorReview: 'ทบทวนข้อผิด',
    studyPlan: 'แผนการเรียน',
    restart: 'เริ่มใหม่',
    daysUnit: 'วัน',
    aseanCountries: 'ประเทศอาเซียน',
    candidateInfo: 'ข้อมูลผู้สมัคร',
    examNotes: 'ข้อปฏิบัติการสอบ',
    languageHint: 'หากคุณเก่งภาษาจีน สามารถเปลี่ยนเป็น 简体中文 ที่มุมขวาบน',
  },
  common: {
    welcome: 'ยินดีต้อนรับสู่ CSCA Pilot Agent',
    next: 'ถัดไป',
    back: 'กลับ',
    complete: 'เสร็จสมบูรณ์',
    loading: 'กำลังโหลด...',
    error: 'เกิดข้อผิดพลาด',
    success: 'สำเร็จ!',
  },
  diagnosis: {
    title: 'วินิจฉัยวิชา',
    description: 'บอกเราเกี่ยวกับแผนการศึกษาของคุณ เราจะแนะนำวิชาที่จำเป็นสำหรับการสอบ CSCA',
    targetMajor: 'สาขาที่ต้องการเรียน *',
    nationality: 'สัญชาติ *',
    highSchoolSystem: 'ระบบโรงเรียนมัธยม',
    hskLevel: 'ระดับ HSK',
    start: 'เริ่มวินิจฉัย',
    resultTitle: 'วินิจฉัยเสร็จสมบูรณ์!',
    requiredSubjects: 'วิชาที่จำเป็น',
    recommendedSubjects: 'วิชาที่แนะนำ',
    estimatedDays: 'เวลาเตรียมตัวแนะนำ',
  },
  knowledgeMap: {
    title: 'แผนที่ความรู้',
    description: 'ระบุจุดแข็งและจุดอ่อนของความรู้',
    selectSubject: 'เลือกวิชา',
    generate: 'สร้างแผนที่ความรู้',
    weak: 'อ่อนแอ',
    needsReview: 'ต้องตรวจสอบ',
    mastered: 'เชี่ยวชาญ',
  },
  adaptiveLearning: {
    title: 'การเรียนรู้ปรับแต่ง',
    description: 'ฝึกหัดที่ออกแบบมาสำหรับจุดอ่อนของคุณ',
    generate: 'สร้างฝึกหัด',
    question: 'คำถาม',
    options: 'ตัวเลือก',
    answer: 'คำตอบ',
    explanation: 'คำอธิบาย',
    submit: 'ส่งคำตอบ',
    next: 'คำถามถัดไป',
  },
  mockExam: {
    title: 'การสอบจำลอง',
    description: 'ทำการสอบจำลองสไตล์ CSCA เพื่อประเมินความพร้อม',
    start: 'เริ่มการสอบ',
    time: 'เวลา',
    answered: 'ตอบแล้ว',
    correct: 'ถูกต้อง',
    submit: 'ส่งคำตอบ',
    completed: 'สอบเสร็จแล้ว!',
    examMode: 'โหมดสอบ',
    fullMode: 'โหมดเต็ม',
    practiceMode: 'โหมดฝึกหัด',
    fullDescription: 'จำนวนข้อสอบและเวลาเดียวกับข้อสอบจริง',
    practiceDescription: 'ข้อสอบน้อยกว่า เหมาะสำหรับฝึกหัดรวดเร็ว',
    examNotes: 'ข้อควรระลึก',
    fullDetails: 'ภาษาจีนวิทยาศาสตร์: 80 ข้อ/90 นาที, คณิตศาสตร์: 60 ข้อ/90 นาที',
    practiceDetails: '10 ข้อต่อวิชา ไม่จำกัดเวลา',
    resultReview: 'ดูคำตอบผิดและคำอธิบาย AI หลังสอบ',
    studyPlanAuto: 'ระบบจะสร้างแผนการเรียนส่วนตัวอัตโนมัติ',
  },
  scoreAnalysis: {
    title: 'วิเคราะห์ผลคะแนน',
    description: 'ได้รับการวิเคราะห์รายละเอียดเกี่ยวกับผลลัพธ์และข้อเสนอแนะการปรับปรุง',
    analyze: 'วิเคราะห์คะแนน',
    totalScore: 'คะแนนรวม',
    percentile: 'เปอร์เซ็นไทล์อันดับ',
    weakPoints: 'จุดอ่อน',
    improvement: 'แผนการปรับปรุง',
    passing: '✓ ผ่านเกณฑ์',
    belowPassing: '✗ ต่ำกว่าเกณฑ์ (60)',
  },
  universityMatch: {
    title: 'จับคู่มหาวิทยาลัย',
    description: 'ค้นหามหาวิทยาลัยจีนอันดับต้นๆ ตามโปรไฟล์ของคุณ',
    selectMajor: 'สาขาที่ต้องการ',
    find: 'ค้นหามหาวิทยาลัย',
    safeSchools: 'มหาวิทยาลัยปลอดภัย',
    targetSchools: 'มหาวิทยาลัยเป้าหมาย',
    reachSchools: 'มหาวิทยาลัยท้าทาย',
    scholarships: 'ทุนการศึกษาที่มี',
    probability: 'ความน่าจะเป็น',
  },
  steps: {
    diagnosis: 'วินิจฉัย',
    knowledgeMap: 'แผนที่ความรู้',
    adaptiveLearning: 'การเรียนรู้ปรับแต่ง',
    mockExam: 'การสอบจำลอง',
    scoreAnalysis: 'วิเคราะห์ผล',
    universityMatch: 'จับคู่มหาวิทยาลัย',
  },
};

export const vi: Translations = {
  nav: {
    tagline: 'Lộ trình học ASEAN toàn diện',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'Trang chủ',
    caseStudy: 'Câu chuyện học sinh',
    aiAssistant: 'Trợ lý AI',
    classroom: 'Lớp OpenMAIC',
    prepCenter: 'Trung tâm ôn thi',
  },
  flow: {
    errorReview: 'Ôn câu sai',
    studyPlan: 'Kế hoạch học',
    restart: 'Bắt đầu lại',
    daysUnit: 'ngày',
    aseanCountries: 'Quốc gia ASEAN',
    candidateInfo: 'Hồ sơ thí sinh',
    examNotes: 'Lưu ý khi thi',
    languageHint: 'Giỏi tiếng Trung? Chọn 简体中文 ở góc trên bên phải.',
  },
  common: {
    welcome: 'Chào mừng đến CSCA Pilot Agent',
    next: 'Tiếp theo',
    back: 'Quay lại',
    complete: 'Hoàn thành',
    loading: 'Đang tải...',
    error: 'Đã xảy ra lỗi',
    success: 'Thành công!',
  },
  diagnosis: {
    title: 'Chẩn đoán môn học',
    description: 'Cho chúng tôi biết về kế hoạch học tập của bạn và chúng tôi sẽ đề xuất các môn học cho kỳ thi CSCA',
    targetMajor: 'Ngành mục tiêu *',
    nationality: 'Quốc tịch *',
    highSchoolSystem: 'Hệ thống trung học',
    hskLevel: 'Cấp độ HSK',
    start: 'Bắt đầu chẩn đoán',
    resultTitle: 'Chẩn đoán hoàn tất!',
    requiredSubjects: 'Các môn bắt buộc',
    recommendedSubjects: 'Các môn đề xuất',
    estimatedDays: 'Thời gian chuẩn bị đề xuất',
  },
  knowledgeMap: {
    title: 'Bản đồ kiến thức',
    description: 'Xác định điểm mạnh và điểm yếu của kiến thức',
    selectSubject: 'Chọn môn học',
    generate: 'Tạo bản đồ kiến thức',
    weak: 'Yếu',
    needsReview: 'Cần xem xét',
    mastered: 'Chuyên môn',
  },
  adaptiveLearning: {
    title: 'Học tập thích ứng',
    description: 'Câu hỏi luyện tập được điều chỉnh theo điểm yếu của bạn',
    generate: 'Tạo bài tập',
    question: 'Câu hỏi',
    options: 'Các lựa chọn',
    answer: 'Trả lời',
    explanation: 'Giải thích',
    submit: 'Gửi câu trả lời',
    next: 'Câu hỏi tiếp theo',
  },
  mockExam: {
    title: 'Kiểm tra mô phỏng',
    description: 'Hoàn thành bài kiểm tra mô phỏng CSCA để đánh giá mức độ sẵn sàng',
    start: 'Bắt đầu kiểm tra',
    time: 'Thời gian',
    answered: 'Đã trả lời',
    correct: 'Đúng',
    submit: 'Nộp bài',
    completed: 'Hoàn thành kiểm tra!',
    examMode: 'Chế độ kiểm tra',
    fullMode: 'Chế độ chính thức',
    practiceMode: 'Chế độ luyện tập',
    fullDescription: 'Số lượng câu hỏi và thời gian giống như kỳ thi chính thức',
    practiceDescription: 'Ít câu hỏi hơn, thích hợp để luyện tập nhanh',
    examNotes: 'Lưu ý thi',
    fullDetails: 'Tiếng Trung Khoa học: 80 câu/90 phút, Toán: 60 câu/90 phút',
    practiceDetails: '10 câu mỗi môn, không giới hạn thời gian',
    resultReview: 'Xem câu trả lời sai và giải thích AI sau khi thi',
    studyPlanAuto: 'Hệ thống sẽ tự động tạo kế hoạch học tập cá nhân',
  },
  scoreAnalysis: {
    title: 'Phân tích điểm',
    description: 'Nhận phân tích chi tiết về kết quả và gợi ý cải thiện',
    analyze: 'Phân tích điểm',
    totalScore: 'Tổng điểm',
    percentile: 'Phần trăm xếp hạng',
    weakPoints: 'Điểm yếu',
    improvement: 'Kế hoạch cải thiện',
    passing: '✓ Đạt chuẩn',
    belowPassing: '✗ Dưới chuẩn (60)',
  },
  universityMatch: {
    title: 'Khớp trường đại học',
    description: 'Tìm trường đại học Trung Quốc lý tưởng dựa trên hồ sơ của bạn',
    selectMajor: 'Ngành mục tiêu',
    find: 'Tìm trường đại học',
    safeSchools: 'Trường an toàn',
    targetSchools: 'Trường mục tiêu',
    reachSchools: 'Trường thách thức',
    scholarships: 'Học bổng có sẵn',
    probability: 'Xác suất',
  },
  steps: {
    diagnosis: 'Chẩn đoán',
    knowledgeMap: 'Bản đồ kiến thức',
    adaptiveLearning: 'Học tập thích ứng',
    mockExam: 'Kiểm tra mô phỏng',
    scoreAnalysis: 'Phân tích điểm',
    universityMatch: 'Khớp trường',
  },
};

export const id: Translations = {
  nav: {
    tagline: 'Jalur Belajar ASEAN Lengkap',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'Beranda',
    caseStudy: 'Kisah Siswa',
    aiAssistant: 'Asisten AI',
    classroom: 'Kelas OpenMAIC',
    prepCenter: 'Pusat Persiapan',
  },
  flow: {
    errorReview: 'Review Salah',
    studyPlan: 'Rencana Belajar',
    restart: 'Mulai Ulang',
    daysUnit: 'hari',
    aseanCountries: 'Negara ASEAN',
    candidateInfo: 'Profil Anda',
    examNotes: 'Panduan Ujian',
    languageHint: 'Fasih bahasa Mandarin? Pilih 简体中文 di kanan atas.',
  },
  common: {
    welcome: 'Selamat datang di CSCA Pilot Agent',
    next: 'Berikutnya',
    back: 'Kembali',
    complete: 'Selesai',
    loading: 'Memuat...',
    error: 'Terjadi kesalahan',
    success: 'Berhasil!',
  },
  diagnosis: {
    title: 'Diagnosa Mata Pelajaran',
    description: 'Ceritakan rencana studi Anda dan kami akan merekomendasikan mata pelajaran untuk ujian CSCA',
    targetMajor: 'Jurusan Target *',
    nationality: 'Kewarganegaraan *',
    highSchoolSystem: 'Sistem Sekolah Menengah',
    hskLevel: 'Tingkat HSK',
    start: 'Mulai Diagnosa',
    resultTitle: 'Diagnosa Selesai!',
    requiredSubjects: 'Mata Pelajaran Wajib',
    recommendedSubjects: 'Mata Pelajaran Direkomendasikan',
    estimatedDays: 'Waktu Persiapan Direkomendasikan',
  },
  knowledgeMap: {
    title: 'Peta Pengetahuan',
    description: 'Identifikasi kekuatan dan kelemahan pengetahuan Anda',
    selectSubject: 'Pilih Mata Pelajaran',
    generate: 'Buat Peta Pengetahuan',
    weak: 'Lemah',
    needsReview: 'Perlu Tinjauan',
    mastered: 'Mahir',
  },
  adaptiveLearning: {
    title: 'Pembelajaran Adaptif',
    description: 'Soal latihan yang disesuaikan dengan kelemahan Anda',
    generate: 'Buat Latihan',
    question: 'Pertanyaan',
    options: 'Pilihan',
    answer: 'Jawaban',
    explanation: 'Penjelasan',
    submit: 'Kirim Jawaban',
    next: 'Pertanyaan Berikutnya',
  },
  mockExam: {
    title: 'Ujian Praktek',
    description: 'Selesaikan ujian praktek gaya CSCA untuk menilai kesiapan Anda',
    start: 'Mulai Ujian',
    time: 'Waktu',
    answered: 'Sudah dijawab',
    correct: 'Benar',
    submit: 'Kirim Ujian',
    completed: 'Ujian Selesai!',
    examMode: 'Mode Ujian',
    fullMode: 'Mode Penuh',
    practiceMode: 'Mode Latihan',
    fullDescription: 'Jumlah soal dan waktu sama dengan ujian resmi',
    practiceDescription: 'Sedikit soal, cocok untuk latihan cepat',
    examNotes: 'Catatan Ujian',
    fullDetails: 'Bahasa Cina Ilmiah: 80 soal/90 menit, Matematika: 60 soal/90 menit',
    practiceDetails: '10 soal per mata pelajaran, tanpa batas waktu',
    resultReview: 'Lihat jawaban salah dan penjelasan AI setelah ujian',
    studyPlanAuto: 'Sistem akan secara otomatis membuat rencana belajar personalisasi',
  },
  scoreAnalysis: {
    title: 'Analisis Skor',
    description: 'Dapatkan analisis detail tentang kinerja dan saran perbaikan',
    analyze: 'Analisis Skor',
    totalScore: 'Skor Total',
    percentile: 'Persentil Peringkat',
    weakPoints: 'Titik Lemah',
    improvement: 'Rencana Perbaikan',
    passing: '✓ Lulus',
    belowPassing: '✗ Dibawah batas (60)',
  },
  universityMatch: {
    title: 'Pencocokan Universitas',
    description: 'Temukan universitas Tiongkok ideal berdasarkan profil Anda',
    selectMajor: 'Jurusan Target',
    find: 'Cari Universitas',
    safeSchools: 'Universitas Aman',
    targetSchools: 'Universitas Target',
    reachSchools: 'Universitas Tantangan',
    scholarships: 'Beasiswa Tersedia',
    probability: 'Kemungkinan',
  },
  steps: {
    diagnosis: 'Diagnosa',
    knowledgeMap: 'Peta Pengetahuan',
    adaptiveLearning: 'Pembelajaran Adaptif',
    mockExam: 'Ujian Praktek',
    scoreAnalysis: 'Analisis Skor',
    universityMatch: 'Pencocokan',
  },
};

export const zh: Translations = {
  nav: {
    tagline: '东盟来华留学全链路备考',
    framework: '清华大学 THU-MAIC · OpenMAIC · LangGraph',
    home: '首页',
    caseStudy: '学生案例',
    aiAssistant: 'AI 助手',
    classroom: 'OpenMAIC 课堂',
    prepCenter: '备考中心',
  },
  flow: {
    errorReview: '错题复习',
    studyPlan: '学习计划',
    restart: '重新开始',
    daysUnit: '天',
    aseanCountries: '东盟国家',
    candidateInfo: '考生信息',
    examNotes: '考试须知',
    languageHint: '中文较好的同学，可在右上角切换为「简体中文」界面与 AI 讲解。',
  },
  common: {
    welcome: '欢迎使用 CSCA 智能备考',
    next: '下一步',
    back: '返回',
    complete: '完成',
    loading: '加载中...',
    error: '发生错误',
    success: '成功',
  },
  diagnosis: {
    title: '学情诊断',
    description: '告诉我们你的升学计划，我们将为你推荐 CSCA 考试科目组合',
    targetMajor: '目标专业 *',
    nationality: '国籍 *',
    highSchoolSystem: '高中学制',
    hskLevel: 'HSK 等级',
    start: '开始诊断',
    resultTitle: '诊断完成',
    requiredSubjects: '必考科目',
    recommendedSubjects: '建议加考',
    estimatedDays: '建议备考周期',
  },
  knowledgeMap: {
    title: '知识图谱',
    description: '可视化掌握度，精准定位薄弱考点',
    selectSubject: '选择科目',
    generate: '生成知识图谱',
    weak: '薄弱',
    needsReview: '待巩固',
    mastered: '已掌握',
  },
  adaptiveLearning: {
    title: '自适应练习',
    description: '根据薄弱点动态推送练习题',
    generate: '开始练习',
    question: '题目',
    options: '选项',
    answer: '答案',
    explanation: '查看解析',
    submit: '提交',
    next: '下一题',
  },
  mockExam: {
    title: '专项模考',
    description: '全真模拟 CSCA 考试，评估当前水平',
    start: '开始考试',
    time: '剩余时间',
    answered: '已答',
    correct: '正确',
    submit: '交卷',
    completed: '考试完成',
    examMode: '考试模式',
    fullMode: '正式模式',
    practiceMode: '练习模式',
    fullDescription: '与正式考试一致的题目数量和时间',
    practiceDescription: '少量题目，适合快速练习',
    examNotes: '考试须知',
    fullDetails: '理科中文80题/90分钟，数学60题/90分钟',
    practiceDetails: '每科10题，不限时间',
    resultReview: '考试结束后可查看错题和AI讲解',
    studyPlanAuto: '系统会自动生成个性化学习计划',
  },
  scoreAnalysis: {
    title: '成绩分析',
    description: '多维度分析报告与提升建议',
    analyze: '分析成绩',
    totalScore: '总分',
    percentile: '预估排名',
    weakPoints: '薄弱模块',
    improvement: '提升计划',
    passing: '✓ 已达及格线',
    belowPassing: '✗ 未达及格线（60分）',
  },
  universityMatch: {
    title: '院校匹配',
    description: '根据成绩与专业推荐中国院校与奖学金',
    selectMajor: '目标专业',
    find: '匹配院校',
    safeSchools: '稳妥院校',
    targetSchools: '目标院校',
    reachSchools: '冲刺院校',
    scholarships: '可申请奖学金',
    probability: '录取概率',
  },
  steps: {
    diagnosis: '学情诊断',
    knowledgeMap: '知识图谱',
    adaptiveLearning: '自适应学习',
    mockExam: '模拟考试',
    scoreAnalysis: '成绩分析',
    universityMatch: '院校匹配',
  },
};

// 马来西亚语 - Bahasa Malaysia
export const ms: Translations = {
  nav: {
    tagline: 'Persiapan penuh laluan ASEAN ke China',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'Laman Utama',
    caseStudy: 'Kisah Pelajar',
    aiAssistant: 'AI Assistant',
    classroom: 'Kelas OpenMAIC',
    prepCenter: 'Pusat Persiapan',
  },
  flow: {
    errorReview: 'Semak Semula Ralat',
    studyPlan: 'Pelan Pembelajaran',
    restart: 'Mulakan Semula',
    daysUnit: 'hari',
    aseanCountries: 'Negara ASEAN',
    candidateInfo: 'Maklumat Calon',
    examNotes: 'Nota Peperiksaan',
    languageHint: 'Bercakap Bahasa China? Tukar ke 简体中文 di sudut kanan atas.',
  },
  common: {
    welcome: 'Selamat Datang ke CSCA Pilot Agent',
    next: 'Seterusnya',
    back: 'Kembali',
    complete: 'Selesai',
    loading: 'Memuat...',
    error: 'Ralat berlaku',
    success: 'Berjaya!',
  },
  diagnosis: {
    title: 'Diagnosis Pembelajaran',
    description: 'Beritahu kami tentang pelan pengajian anda dan kami akan mengesyorkan subjek peperiksaan CSCA',
    targetMajor: 'Jurusan Sasaran *',
    nationality: 'Kewarganegaraan *',
    highSchoolSystem: 'Sistem Sekolah Menengah',
    hskLevel: 'Tahap HSK',
    start: 'Mulakan Diagnosis',
    resultTitle: 'Diagnosis Selesai!',
    requiredSubjects: 'Subjek Wajib',
    recommendedSubjects: 'Subjek Disyorkan',
    estimatedDays: 'Masa Persiapan Disyorkan',
  },
  knowledgeMap: {
    title: 'Peta Pengetahuan',
    description: 'Kenal pasti kekuatan dan kelemahan pengetahuan anda',
    selectSubject: 'Pilih Subjek',
    generate: 'Jana Peta Pengetahuan',
    weak: 'Lemah',
    needsReview: 'Perlu Semak',
    mastered: 'Mahir',
  },
  adaptiveLearning: {
    title: 'Pembelajaran Adaptif',
    description: 'Latihan soalan yang disesuaikan dengan kelemahan anda',
    generate: 'Jana Latihan',
    question: 'Soalan',
    options: 'Pilihan',
    answer: 'Jawapan',
    explanation: 'Penjelasan',
    submit: 'Hantar Jawapan',
    next: 'Soalan Seterusnya',
  },
  mockExam: {
    title: 'Peperiksaan Tiruan',
    description: 'Selesaikan peperiksaan tiruan gaya CSCA untuk menilai kesediaan anda',
    start: 'Mulakan Peperiksaan',
    time: 'Masa',
    answered: 'Telah dijawab',
    correct: 'Betul',
    submit: 'Hantar Peperiksaan',
    completed: 'Peperiksaan Selesai!',
    examMode: 'Mod Peperiksaan',
    fullMode: 'Mod Penuh',
    practiceMode: 'Mod Latihan',
    fullDescription: 'Bilangan soalan dan masa yang sama dengan peperiksaan rasmi',
    practiceDescription: 'Sedikit soalan, sesuai untuk latihan pantas',
    examNotes: 'Nota Peperiksaan',
    fullDetails: 'Bahasa Cina Sains: 80 soalan/90 minit, Matematik: 60 soalan/90 minit',
    practiceDetails: '10 soalan setiap subjek, tiada had masa',
    resultReview: 'Lihat jawapan salah dan penjelasan AI selepas peperiksaan',
    studyPlanAuto: 'Sistem akan menjana pelan pembelajaran peribadi secara automatik',
  },
  scoreAnalysis: {
    title: 'Analisis Skor',
    description: 'Dapatkan analisis terperinci prestasi dan cadangan penambahbaikan',
    analyze: 'Analisis Skor',
    totalScore: 'Jumlah Skor',
    percentile: 'Percentil Peringkat',
    weakPoints: 'Titik Lemah',
    improvement: 'Pelan Penambahbaikan',
    passing: '✓ Lulus',
    belowPassing: '✗ Dibawah paras (60)',
  },
  universityMatch: {
    title: 'Padanan Universiti',
    description: 'Cari universiti China ideal berdasarkan profil anda',
    selectMajor: 'Jurusan Sasaran',
    find: 'Cari Universiti',
    safeSchools: 'Universiti Selamat',
    targetSchools: 'Universiti Sasaran',
    reachSchools: 'Universiti Cabaran',
    scholarships: 'Biasiswa Tersedia',
    probability: 'Kebarangkalian',
  },
  steps: {
    diagnosis: 'Diagnosis',
    knowledgeMap: 'Peta Pengetahuan',
    adaptiveLearning: 'Pembelajaran Adaptif',
    mockExam: 'Peperiksaan Tiruan',
    scoreAnalysis: 'Analisis Skor',
    universityMatch: 'Padanan',
  },
};

// 菲律宾语 - Filipino
export const tl: Translations = {
  nav: {
    tagline: 'Kumpletong Landas ng Pag-aaral para sa ASEAN',
    framework: 'THU-MAIC OpenMAIC · LangGraph',
    home: 'Home',
    caseStudy: 'Mga Kwento ng Mag-aaral',
    aiAssistant: 'AI Assistant',
    classroom: 'OpenMAIC Classroom',
    prepCenter: 'Sentro ng Paghahanda',
  },
  flow: {
    errorReview: 'Balingwalang Pagsusuri',
    studyPlan: 'Plano ng Pag-aaral',
    restart: 'Magsimula Muli',
    daysUnit: 'araw',
    aseanCountries: 'Bansang ASEAN',
    candidateInfo: 'Impormasyon ng Kandidato',
    examNotes: 'Mga Tala sa Pagsusulit',
    languageHint: 'Marunong ka bang magsalita ng Tsino? Palitan sa 简体中文 sa kanang sulok sa itaas.',
  },
  common: {
    welcome: 'Maligayang Pagdating sa CSCA Pilot Agent',
    next: 'Susunod',
    back: 'Bumalik',
    complete: 'Kumpleto',
    loading: 'Naglo-load...',
    error: 'Nagkaroon ng error',
    success: 'Matagumpay!',
  },
  diagnosis: {
    title: 'Diagnosis ng Paksa',
    description: 'Sabihin sa amin ang tungkol sa iyong plano sa pag-aaral at irerekomenda namin ang mga paksa para sa CSCA exam',
    targetMajor: 'Target Major *',
    nationality: 'Nasyonalidad *',
    highSchoolSystem: 'Sistema ng Mataas na Paaralan',
    hskLevel: 'Antas ng HSK',
    start: 'Simulan ang Diagnosis',
    resultTitle: 'Diagnosis Kumpleto!',
    requiredSubjects: 'Mga Kinakailangang Paksa',
    recommendedSubjects: 'Mga Inirekumendang Paksa',
    estimatedDays: 'Inirerekomendang Oras ng Paghahanda',
  },
  knowledgeMap: {
    title: 'Mapa ng Kaalaman',
    description: 'Tukuyin ang iyong lakas at kahinaan sa kaalaman',
    selectSubject: 'Pumili ng Paksa',
    generate: 'Bumuo ng Mapa ng Kaalaman',
    weak: 'Mahina',
    needsReview: 'Kailangan ng Pagsusuri',
    mastered: 'Sanay',
  },
  adaptiveLearning: {
    title: 'Adaptive Learning',
    description: 'Mga pagsasanay na iniangkop sa iyong mga kahinaan',
    generate: 'Bumuo ng Pagsasanay',
    question: 'Tanong',
    options: 'Mga Opsyon',
    answer: 'Sagot',
    explanation: 'Paliwanag',
    submit: 'Ipasok ang Sagot',
    next: 'Susunod na Tanong',
  },
  mockExam: {
    title: 'Mock Exam',
    description: 'Kumpletuhin ang isang buong CSCA-style mock exam upang masuri ang iyong kahandaan',
    start: 'Simulan ang Exam',
    time: 'Oras',
    answered: 'Sinagot',
    correct: 'Tama',
    submit: 'Ipasok ang Exam',
    completed: 'Exam Kumpleto!',
    examMode: 'Mode ng Exam',
    fullMode: 'Full Mode',
    practiceMode: 'Practice Mode',
    fullDescription: 'Kaparehong bilang ng mga tanong at oras tulad ng opisyal na exam',
    practiceDescription: 'Kaunting tanong, angkop para sa mabilis na pagsasanay',
    examNotes: 'Mga Tala sa Exam',
    fullDetails: 'Science Chinese: 80 tanong/90 minuto, Math: 60 tanong/90 minuto',
    practiceDetails: '10 tanong bawat subject, walang limitasyon sa oras',
    resultReview: 'Tingnan ang mga maling sagot at AI explanations pagkatapos ng exam',
    studyPlanAuto: 'Awtomatikong gagawin ng system ang personalized study plan',
  },
  scoreAnalysis: {
    title: 'Pagsusuri ng Marka',
    description: 'Makakuha ng detalyadong pagsusuri ng iyong pagganap at mga mungkahi sa pagpapabuti',
    analyze: 'Suriin ang Marka',
    totalScore: 'Kabuuan ng Marka',
    percentile: 'Ranking Percentile',
    weakPoints: 'Mahinang Puntos',
    improvement: 'Plano sa Pagpapabuti',
    passing: '✓ Nakapasa',
    belowPassing: '✗ Mababa sa passing (60)',
  },
  universityMatch: {
    title: 'Pagtutugma ng Unibersidad',
    description: 'Hanapin ang iyong perpektong unibersidad sa Tsina batay sa iyong profile',
    selectMajor: 'Target Major',
    find: 'Hanapin ang Mga Unibersidad',
    safeSchools: 'Mga ligtas na Paaralan',
    targetSchools: 'Mga Layunin na Paaralan',
    reachSchools: 'Mga Hamon na Paaralan',
    scholarships: 'Magagamit na Scholarship',
    probability: 'Probability',
  },
  steps: {
    diagnosis: 'Diagnosis',
    knowledgeMap: 'Mapa ng Kaalaman',
    adaptiveLearning: 'Adaptive Learning',
    mockExam: 'Mock Exam',
    scoreAnalysis: 'Pagsusuri ng Marka',
    universityMatch: 'Pag-tutugma',
  },
};

export const translations: Record<string, Translations> = {
  zh,
  en,
  th,
  vi,
  id,
  ms,
  tl,
};

export const LANGUAGES = [
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Malaysia', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
];

export function getTranslation(locale: string): Translations {
  return translations[locale] || en;
}
