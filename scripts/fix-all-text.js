const fs = require('fs');
const f = 'lib/i18n/translations.ts';
let c = fs.readFileSync(f, 'utf-8').replace(/\r\n/g, '\n');

// Values per locale
const generateMap = {
  en: 'Generating...',
  th: 'กำลังสร้าง...',
  vi: 'Đang tạo...',
  id: 'Memuat...',
  zh: '生成中...',
  ms: 'Menjana...',
  tl: 'Nag-generate...',
};

const fromErrorsMap = {
  en: '📚 Generate from Errors',
  th: '📚 สร้างจากข้อผิดพลาด',
  vi: '📚 Tạo từ lỗi sai',
  id: '📚 Buat dari Kesalahan',
  zh: '📚 根据错题生成课堂',
  ms: '📚 Jana daripada Ralat',
  tl: '📚 Mula sa Error',
};

const placeholderMap = {
  en: 'Describe your learning needs, e.g. CSCA math prep course for Thai students...',
  th: 'อธิบายความต้องการเรียนของคุณ...',
  vi: 'Nhập nhu cầu học tập của bạn...',
  id: 'Masukkan kebutuhan belajar Anda...',
  zh: '输入您的学习需求，例如：生成一节针对泰国学生的CSCA数学备考课程...',
  ms: 'Terangkan keperluan pembelajaran anda...',
  tl: 'Ilarawan ang iyong pangangailangan...',
};

// For each locale, add generating to common, and generateFromErrors + placeholder to classroomSection
for (const [key, val] of Object.entries(generateMap)) {
  // Add generating after loading in common
  const loadingPattern = `    loading: '${key === 'en' ? 'Loading' : ''}'`;
  if (key === 'en') {
    c = c.replace(
      "    loading: 'Loading...',\n    error: 'An error occurred',",
      `    loading: 'Loading...',\n    generating: 'Generating...',\n    error: 'An error occurred',`
    );
  } else if (key === 'zh') {
    c = c.replace(
      "    loading: '加载中...',\n    error: '发生错误',",
      `    loading: '加载中...',\n    generating: '生成中...',\n    error: '发生错误',`
    );
  } else if (key === 'th') {
    c = c.replace(
      "    loading: 'กำลังโหลด...',\n    error: 'เกิดข้อผิดพลาด',",
      `    loading: 'กำลังโหลด...',\n    generating: 'กำลังสร้าง...',\n    error: 'เกิดข้อผิดพลาด',`
    );
  } else if (key === 'vi') {
    c = c.replace(
      "    loading: 'Đang tải...',\n    error: 'Đã xảy ra lỗi',",
      `    loading: 'Đang tải...',\n    generating: 'Đang tạo...',\n    error: 'Đã xảy ra lỗi',`
    );
    c = c.replace(
      "    loading: 'Memuat...',\n    error: 'Kesalahan',",
      `    loading: 'Memuat...',\n    generating: 'Memuat...',\n    error: 'Kesalahan',`
    );
  } else if (key === 'id') {
    c = c.replace(
      "    loading: 'Memuat...',\n    error: 'Terjadi kesalahan',",
      `    loading: 'Memuat...',\n    generating: 'Memuat...',\n    error: 'Terjadi kesalahan',`
    );
  } else if (key === 'ms') {
    c = c.replace(
      "    loading: 'Memuat...',\n    error: 'Ralat berlaku',",
      `    loading: 'Memuat...',\n    generating: 'Menjana...',\n    error: 'Ralat berlaku',`
    );
  } else if (key === 'tl') {
    c = c.replace(
      "    loading: 'Naglo-load...',\n    error: 'Nagkaroon ng error',",
      `    loading: 'Naglo-load...',\n    generating: 'Nag-generate...',\n    error: 'Nagkaroon ng error',`
    );
  }

  // Add generateFromErrors and placeholder after generate in classroomSection
  if (['en', 'zh', 'th'].includes(key)) {
    // These already have natural classroomSection
    const fromErrors = fromErrorsMap[key];
    const placeholder = placeholderMap[key];
    if (key === 'en') {
      c = c.replace(
        "    generate: 'Generate Classroom',\n  },\n\n  common:",
        `    generate: 'Generate Classroom',\n    generateFromErrors: '${fromErrors}',\n    placeholder: '${placeholder}',\n  },\n\n  common:`
      );
    } else if (key === 'zh') {
      c = c.replace(
        "    generate: '生成课堂',\n  },\n\n  common:",
        `    generate: '生成课堂',\n    generateFromErrors: '${fromErrors}',\n    placeholder: '${placeholder}',\n  },\n\n  common:`
      );
    } else if (key === 'th') {
      c = c.replace(
        "    generate: 'สร้างห้องเรียน',\n  },\n\n  common:",
        `    generate: 'สร้างห้องเรียน',\n    generateFromErrors: '${fromErrors}',\n    placeholder: '${placeholder}',\n  },\n\n  common:`
      );
    }
  }
}

fs.writeFileSync(f, c, 'utf-8');
console.log('✅ Done');
