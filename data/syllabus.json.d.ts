interface SyllabusNode {
  id: string;
  name: string;
  subject: string;
  type: 'subject' | 'module' | 'topic' | 'knowledge_point';
  difficulty: number;
  parents: string[];
  children: string[];
}

interface SyllabusData {
  metadata: {
    subjects: string[];
    version: string;
    lastUpdated: string;
  };
  nodes: SyllabusNode[];
}

declare module '@/data/syllabus.json' {
  const syllabusData: SyllabusData;
  export default syllabusData;
}