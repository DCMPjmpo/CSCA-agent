// 临时验证脚本：三个专业的科目映射是否不同
import {
  getMajorSubjectMap,
  getMappingStats,
  validateSubjectMapping,
} from '../lib/csca/major-subject-map';

const med = getMajorSubjectMap('临床医学');
const eng = getMajorSubjectMap('工程学');
const biz = getMajorSubjectMap('工商管理');

console.log('=== Phase C 验证：三个专业的科目映射 ===');
console.log('Medicine (临床医学):', med.requiredSubjects, '| confidence:', med.confidence);
console.log('Engineering (工程学):', eng.requiredSubjects, '| confidence:', eng.confidence);
console.log('Business (工商管理):', biz.requiredSubjects, '| confidence:', biz.confidence);

const allDiff =
  JSON.stringify(med.requiredSubjects) !== JSON.stringify(eng.requiredSubjects) &&
  JSON.stringify(eng.requiredSubjects) !== JSON.stringify(biz.requiredSubjects) &&
  JSON.stringify(med.requiredSubjects) !== JSON.stringify(biz.requiredSubjects);

console.log('\n三个专业科目是否完全不同:', allDiff);
console.log(
  'Medicine 多了化学:',
  med.requiredSubjects.includes('化学') && !eng.requiredSubjects.includes('化学'),
);
console.log(
  'Engineering 有物理无化学:',
  eng.requiredSubjects.includes('物理') && !eng.requiredSubjects.includes('化学'),
);
console.log('Business 只有2科:', biz.requiredSubjects.length === 2);

console.log('\n=== 映射统计 ===');
console.log(getMappingStats());

console.log('\n=== 科目映射与 exam-config 一致性 ===');
console.log(validateSubjectMapping());
