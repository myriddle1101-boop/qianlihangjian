import type { InspirationPost, Profile, Requirement } from './types'

export const countries = ['France', 'Italy', 'Spain', 'Germany', 'Netherlands']
export const countryLabels: Record<string, string> = { France: '法国', Italy: '意大利', Spain: '西班牙', Germany: '德国', Netherlands: '荷兰' }
export const officialSources: Record<string, { name: string; url: string; checked: string }> = {
  France: { name: 'France-Visas', url: 'https://france-visas.gouv.fr/', checked: '2026-07-19' },
  Italy: { name: '意大利外交部 Visa for Italy', url: 'https://vistoperitalia.esteri.it/', checked: '2026-07-19' },
  Spain: { name: '西班牙外交部', url: 'https://www.exteriores.gob.es/', checked: '2026-07-19' },
  Germany: { name: '德国外交部', url: 'https://www.auswaertiges-amt.de/en/visa-service', checked: '2026-07-19' },
  Netherlands: { name: 'Netherlands Worldwide', url: 'https://www.netherlandsworldwide.nl/visa-the-netherlands/schengen-visa', checked: '2026-07-19' },
}

const base: Omit<Requirement, 'applies'>[] = [
  { id: 'passport', category: '身份与护照', name: '有效护照与信息页复印件', en: 'Valid passport and bio-data copy', level: 'required', channel: 'both', originals: '护照原件＋信息页复印件', source: '主申国官方签证说明', sourceUrl: '', fields: ['name', 'passportNo', 'passportExpiry'] },
  { id: 'application', category: '申请表', name: '完整签证申请表', en: 'Completed visa application form', level: 'required', channel: 'online', originals: '按签证中心要求打印签字', source: '主申国官方签证说明', sourceUrl: '', fields: ['name', 'startDate', 'endDate'] },
  { id: 'transport', category: '交通与住宿', name: '往返交通预订', en: 'Round-trip transport booking', level: 'required', channel: 'both', originals: '电子预订凭证', source: '主申国官方签证说明', sourceUrl: '', fields: ['name', 'outboundDate', 'returnDate'] },
  { id: 'hotel', category: '交通与住宿', name: '全程住宿证明', en: 'Accommodation covering the stay', level: 'required', channel: 'both', originals: '覆盖所有住宿夜晚', source: '主申国官方签证说明', sourceUrl: '', fields: ['hotelCity', 'checkin', 'checkout'] },
  { id: 'insurance', category: '旅行保险', name: '申根旅行医疗保险', en: 'Schengen travel medical insurance', level: 'required', channel: 'both', originals: '保单原件／打印件', source: '主申国官方签证说明', sourceUrl: '', fields: ['name', 'insuranceStart', 'insuranceEnd', 'coverage'] },
  { id: 'funds', category: '财力证明', name: '银行流水或资金证明', en: 'Proof of financial means', level: 'required', channel: 'both', originals: '按官方要求准备流水', source: '主申国官方签证说明', sourceUrl: '', fields: ['name', 'bankDate', 'balance'] },
  { id: 'itinerary', category: '生成文件', name: '中英双语行程单', en: 'Bilingual itinerary', level: 'required', channel: 'both', originals: '打印件', source: '系统生成，需与预订一致', sourceUrl: '', fields: [] },
  { id: 'cover', category: '生成文件', name: '签证解释信', en: 'Visa cover letter', level: 'recommended', channel: 'both', originals: '签字版（如需要）', source: '系统生成，需如实陈述', sourceUrl: '', fields: [] },
]
export function requirementsFor(profile: Profile | null): Requirement[] {
  const source = officialSources[profile?.applicationCountry || 'France'] || officialSources.France
  const items: Requirement[] = base.map((item) => ({ ...item, applies: '适用于当前申请档案', sourceUrl: source.url }))
  if (profile?.submissionPlace === 'uk') items.splice(2, 0, { id: 'residence', category: '居住证明', name: '英国合法居留证明', en: 'Valid UK residence evidence', level: 'required', channel: 'both', originals: 'eVisa/BRP打印或证明', applies: '英国递签必需', source: source.name, sourceUrl: source.url, fields: ['name', 'permitExpiry'] })
  if (profile?.status === 'student') items.push({ id: 'student', category: '学业／工作证明', name: '在读证明', en: 'Student enrolment letter', level: 'conditional', channel: 'both', originals: '学校近期开具证明', applies: '学生申请人', source: source.name, sourceUrl: source.url, fields: ['name', 'school', 'issueDate'] })
  else if (profile?.status === 'employed') items.push({ id: 'employment', category: '学业／工作证明', name: '在职与准假证明', en: 'Employment and leave letter', level: 'conditional', channel: 'both', originals: '雇主盖章或签字文件', applies: '在职申请人', source: source.name, sourceUrl: source.url, fields: ['name', 'employer', 'leaveStart', 'leaveEnd'] })
  return items
}
export const demoPosts: InspirationPost[] = [
  { id: 'post-rome', title: '意大利7日慢游：罗马—佛罗伦萨—威尼斯', tags: ['意大利', '7日', '文化路线'], summary: '适合作为多城交通衔接灵感；请以实际预订与停留天数为准。' },
  { id: 'post-paris', title: '巴黎+南法9日第一次欧洲自由行', tags: ['法国', '9日', '首次申根'], summary: '以巴黎为主停留的路线参考，适合初次规划法国行程。' },
  { id: 'post-multi', title: '法意双国火车线：城市怎么排更顺', tags: ['法意', '火车', '多国'], summary: '仅作城市顺序灵感；主申国仍需按实际最长停留规则确定。' },
]
