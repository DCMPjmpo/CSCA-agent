/**
 * CSCA考试大纲加载模块
 * 从JSON文件加载考试大纲数据，支持按科目、模块、知识点查询
 * 
 * 大纲结构：
 * - subject（科目）: 最高层级，如数学、物理、化学、理科中文、文科中文
 * - module（模块）: 科目的主要组成部分
 * - topic（主题）: 模块下的具体主题
 * - knowledge_point（知识点）: 最细粒度的知识单元
 */

import syllabusData from '@/data/syllabus.json';

interface SyllabusData {
  metadata: { subjects: string[]; [key: string]: any };
  nodes: SyllabusNode[];
}

const typedSyllabusData = syllabusData as unknown as SyllabusData;

export interface SyllabusNode {
    id: string;
    name: string;
    subject: string;
    type: 'subject' | 'module' | 'topic' | 'knowledge_point';
    difficulty: number;
    parents: string[];
    children: string[];
}

export interface SubjectInfo {
    id: string;
    name: string;
    modules: ModuleInfo[];
}

export interface ModuleInfo {
    id: string;
    name: string;
    difficulty: number;
    topics: TopicInfo[];
}

export interface TopicInfo {
    id: string;
    name: string;
    difficulty: number;
    knowledgePoints: KnowledgePointInfo[];
}

export interface KnowledgePointInfo {
    id: string;
    name: string;
    difficulty: number;
}

// 获取所有科目
export function getAllSubjects(): string[] {
    return typedSyllabusData.metadata.subjects;
}

// 获取所有节点
export function getAllNodes(): SyllabusNode[] {
    return typedSyllabusData.nodes;
}

// 根据ID获取节点
export function getNodeById(id: string): SyllabusNode | undefined {
    return typedSyllabusData.nodes.find(node => node.id === id);
}

// 根据科目获取节点
export function getNodesBySubject(subject: string): SyllabusNode[] {
    return typedSyllabusData.nodes.filter(node => node.subject === subject);
}

// 根据类型获取节点
export function getNodesByType(type: SyllabusNode['type']): SyllabusNode[] {
    return typedSyllabusData.nodes.filter(node => node.type === type);
}

// 获取科目详情（包含完整层级结构）
export function getSubjectDetail(subjectName: string): SubjectInfo | null {
    const subjectNode = typedSyllabusData.nodes.find(
        node => node.type === 'subject' && node.name === subjectName
    );

    if (!subjectNode) return null;

    const modules: ModuleInfo[] = [];

    subjectNode.children.forEach(moduleId => {
        const moduleNode = getNodeById(moduleId);
        if (!moduleNode || moduleNode.type !== 'module') return;

        const topics: TopicInfo[] = [];

        moduleNode.children.forEach(topicId => {
            const topicNode = getNodeById(topicId);
            if (!topicNode || topicNode.type !== 'topic') return;

            const knowledgePoints: KnowledgePointInfo[] = [];

            topicNode.children.forEach(kpId => {
                const kpNode = getNodeById(kpId);
                if (!kpNode || kpNode.type !== 'knowledge_point') return;

                knowledgePoints.push({
                    id: kpNode.id,
                    name: kpNode.name,
                    difficulty: kpNode.difficulty
                });
            });

            topics.push({
                id: topicNode.id,
                name: topicNode.name,
                difficulty: topicNode.difficulty,
                knowledgePoints
            });
        });

        modules.push({
            id: moduleNode.id,
            name: moduleNode.name,
            difficulty: moduleNode.difficulty,
            topics
        });
    });

    return {
        id: subjectNode.id,
        name: subjectNode.name,
        modules
    };
}

// 获取所有科目的详情
export function getAllSubjectDetails(): SubjectInfo[] {
    return getAllSubjects().map(subjectName => {
        const detail = getSubjectDetail(subjectName);
        return detail!;
    }).filter(Boolean);
}

// 获取某个科目的所有知识点
export function getKnowledgePointsBySubject(subject: string): KnowledgePointInfo[] {
    const result: KnowledgePointInfo[] = [];
    const nodes = getNodesBySubject(subject);

    nodes.forEach(node => {
        if (node.type === 'knowledge_point') {
            result.push({
                id: node.id,
                name: node.name,
                difficulty: node.difficulty
            });
        }
    });

    return result;
}

// 获取某个知识点的路径（从科目到知识点的完整路径）
export function getNodePath(nodeId: string): string[] {
    const path: string[] = [];
    let currentNode = getNodeById(nodeId);

    while (currentNode) {
        path.unshift(currentNode.name);
        if (currentNode.parents.length === 0) break;
        currentNode = getNodeById(currentNode.parents[0]);
    }

    return path;
}

// 获取某个知识点的兄弟节点
export function getSiblingNodes(nodeId: string): SyllabusNode[] {
    const node = getNodeById(nodeId);
    if (!node || node.parents.length === 0) return [];

    const parentNode = getNodeById(node.parents[0]);
    if (!parentNode) return [];

    return parentNode.children
        .map(childId => getNodeById(childId))
        .filter((n): n is SyllabusNode => n !== undefined && n.id !== nodeId);
}

// 根据难度获取知识点
export function getNodesByDifficulty(minDifficulty?: number, maxDifficulty?: number): SyllabusNode[] {
    return typedSyllabusData.nodes.filter(node => {
        if (minDifficulty !== undefined && node.difficulty < minDifficulty) return false;
        if (maxDifficulty !== undefined && node.difficulty > maxDifficulty) return false;
        return true;
    });
}

// 搜索知识点（根据名称）
export function searchNodes(keyword: string): SyllabusNode[] {
    const lowerKeyword = keyword.toLowerCase();
    return typedSyllabusData.nodes.filter(node =>
        node.name.toLowerCase().includes(lowerKeyword)
    );
}

// 获取大纲元数据
export function getSyllabusMetadata() {
    return typedSyllabusData.metadata;
}

// 统计某个科目的知识点数量
export function countKnowledgePoints(subject: string): number {
    return getKnowledgePointsBySubject(subject).length;
}

// 获取科目难度分布
export function getDifficultyDistribution(subject: string): Record<number, number> {
    const distribution: Record<number, number> = {};
    const nodes = getNodesBySubject(subject);

    nodes.forEach(node => {
        if (node.type === 'knowledge_point') {
            distribution[node.difficulty] = (distribution[node.difficulty] || 0) + 1;
        }
    });

    return distribution;
}
