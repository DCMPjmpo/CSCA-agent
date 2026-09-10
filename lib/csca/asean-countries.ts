/**
 * 东盟十国基础信息（去像素 flag 保留 ASCII code；避免 flag emoji 视觉不统一）
 * 在 Batch 4 首页 Hero Stats Cards 与 Batch 5 /csca 诊断模块之间共享。
 */
export interface ASEANCountry {
  code: string;
  /** 国家中文名（短，显示于诊断选择与 Hero Stats） */
  name: string;
  /** 国家英文名（en locale 显示） */
  nameEn: string;
  /** HSK 最低要求（作为真实 metadata 不编造） */
  hskRequirement: number;
}

export const ASEAN_COUNTRIES: readonly ASEANCountry[] = [
  { code: 'TH', name: '泰国', nameEn: 'Thailand', hskRequirement: 4 },
  { code: 'VN', name: '越南', nameEn: 'Vietnam', hskRequirement: 4 },
  { code: 'MY', name: '马来西亚', nameEn: 'Malaysia', hskRequirement: 4 },
  { code: 'ID', name: '印度尼西亚', nameEn: 'Indonesia', hskRequirement: 4 },
  { code: 'PH', name: '菲律宾', nameEn: 'Philippines', hskRequirement: 4 },
  { code: 'SG', name: '新加坡', nameEn: 'Singapore', hskRequirement: 3 },
  { code: 'BN', name: '文莱', nameEn: 'Brunei', hskRequirement: 4 },
  { code: 'KH', name: '柬埔寨', nameEn: 'Cambodia', hskRequirement: 4 },
  { code: 'LA', name: '老挝', nameEn: 'Laos', hskRequirement: 4 },
  { code: 'MM', name: '缅甸', nameEn: 'Myanmar', hskRequirement: 4 },
];
