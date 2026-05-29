/**
 * CSCA University Matching API
 * Step 6: Recommend universities and scholarships based on profile
 */

import { NextResponse } from 'next/server';
import { UNIVERSITIES, getUniversitiesByScore, calculateMatchScore } from '@/lib/csca/university-database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { score, targetMajor, nationality } = body;

    if (!targetMajor) {
      return NextResponse.json(
        { error: 'Target major is required' },
        { status: 400 }
      );
    }

    const userScore = score || 50;

    const matchedUniversities = getUniversitiesByScore(userScore, targetMajor);

    const categorized = {
      safeSchools: [] as any[],
      targetSchools: [] as any[],
      reachSchools: [] as any[],
    };

    matchedUniversities.forEach((university) => {
      const matchScore = calculateMatchScore(userScore, university);

      if (matchScore >= 70) {
        categorized.safeSchools.push({
          name: university.name,
          nameZh: university.nameZh,
          location: university.location,
          probability: matchScore / 100,
          matchScore,
          requirements: [university.hskRequirement, `GPA ${university.gpaRequirement}`],
          type: university.type,
          description: university.description,
        });
      } else if (matchScore >= 40) {
        categorized.targetSchools.push({
          name: university.name,
          nameZh: university.nameZh,
          location: university.location,
          probability: matchScore / 100,
          matchScore,
          requirements: [university.hskRequirement, `GPA ${university.gpaRequirement}`],
          type: university.type,
          description: university.description,
        });
      } else {
        categorized.reachSchools.push({
          name: university.name,
          nameZh: university.nameZh,
          location: university.location,
          probability: matchScore / 100,
          matchScore,
          requirements: [university.hskRequirement, `GPA ${university.gpaRequirement}`],
          type: university.type,
          description: university.description,
        });
      }
    });

    if (categorized.safeSchools.length === 0) {
      const backupSchools = UNIVERSITIES.filter(
        (u) => u.type === 'backup' && u.majors.some((m) =>
          m.toLowerCase().includes(targetMajor.toLowerCase())
        )
      ).slice(0, 3);

      backupSchools.forEach((u) => {
        categorized.safeSchools.push({
          name: u.name,
          nameZh: u.nameZh,
          location: u.location,
          probability: Math.max(0.1, (userScore - u.minScore) / (u.maxScore - u.minScore)),
          matchScore: Math.max(10, calculateMatchScore(userScore, u)),
          requirements: [u.hskRequirement, `GPA ${u.gpaRequirement}`],
          type: u.type,
          description: u.description,
        });
      });
    }

    if (categorized.reachSchools.length === 0) {
      const topSchools = UNIVERSITIES.filter(
        (u) => u.type === 'top' && u.majors.some((m) =>
          m.toLowerCase().includes(targetMajor.toLowerCase())
        )
      ).slice(0, 3);

      topSchools.forEach((u) => {
        categorized.reachSchools.push({
          name: u.name,
          nameZh: u.nameZh,
          location: u.location,
          probability: Math.min(0.3, (userScore - u.minScore) / (u.maxScore - u.minScore)),
          matchScore: Math.min(30, calculateMatchScore(userScore, u)),
          requirements: [u.hskRequirement, `GPA ${u.gpaRequirement}`],
          type: u.type,
          description: u.description,
        });
      });
    }

    const scholarships = [
      {
        name: 'Chinese Government Scholarship',
        description: 'Full scholarship for outstanding international students',
        requirements: ['Excellent academic record', 'Good HSK score', 'Letter of recommendation'],
      },
      {
        name: 'University Scholarship',
        description: 'Partial or full tuition waiver',
        requirements: ['Good CSCA score', 'Academic achievements'],
      },
      {
        name: 'ASEAN Student Scholarship',
        description: 'Special scholarship for ASEAN students studying in China',
        requirements: ['ASEAN nationality', 'Good academic performance', 'HSK 4+'],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        ...categorized,
        scholarships,
        score: userScore,
      },
      step: 6,
    });
  } catch (error) {
    console.error('[CSCA University Match API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
