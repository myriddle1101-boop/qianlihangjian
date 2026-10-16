import type { AppState, Issue, ItineraryDay, Report } from './types'
import { requirementsFor } from './data'

const dateMs = (value: string) => value ? new Date(`${value}T00:00:00`).getTime() : NaN
const diffDays = (a: string, b: string) => Math.round((dateMs(b) - dateMs(a)) / 86400000)
const issue = (x: Omit<Issue, 'source'> & { source?: string }): Issue => ({ source: '欧盟官方申根签证要求／主申国官方页面', ...x })

export function runConsistencyCheck(state: AppState): Report {
  const profile = state.profile
  const issues: Issue[] = []
  const passedRules: string[] = []
  const uncheckedRules: string[] = []
  if (!profile) return { createdAt: new Date().toISOString(), coverage: 0, issues: [issue({ id: 'NO_PROFILE', severity: 'info', title: '尚未建立申请档案', materials: [], found: '无申请信息', reason: '需要先填写主申国和旅行日期。', action: '前往建立申请', target: '/setup' })], passedRules, uncheckedRules }
  const extracted = Object.values(state.extracted).reduce((all, fields) => ({ ...all, ...fields }), {})
  const docs = new Set(state.documents.map((d) => d.requirementId))
  const requirements = requirementsFor(profile)
  const check = (rule: string, ok: boolean, fail: Issue, unchecked = false) => ok ? passedRules.push(rule) : unchecked ? uncheckedRules.push(rule) : issues.push(fail)
  check('身份信息', !extracted.name || !profile.name || extracted.name === profile.name, issue({ id: 'IDENTITY_NAME', severity: 'error', title: '姓名存在不一致', materials: ['申请档案', '上传文件'], found: `${profile.name || '申请档案未填写'} / ${extracted.name || '文件未确认'}`, reason: '不同材料中的姓名必须保持一致。', action: '前往材料清单确认姓名字段', target: '/workspace/materials' }), !extracted.name)
  check('保险覆盖旅行日期', !extracted.insuranceStart || !extracted.insuranceEnd || (dateMs(extracted.insuranceStart) <= dateMs(profile.startDate) && dateMs(extracted.insuranceEnd) >= dateMs(profile.endDate)), issue({ id: 'INSURANCE_DATE', severity: 'error', title: '保险未覆盖完整旅行日期', materials: ['旅行保险', '申请档案'], found: `${extracted.insuranceStart || '未确认'} — ${extracted.insuranceEnd || '未确认'}`, reason: '保险日期早于出发或早于返回日期。', action: '补充覆盖完整行程的保险', target: '/workspace/materials' }), !extracted.insuranceStart)
  check('护照有效期', !extracted.passportExpiry || diffDays(profile.endDate, extracted.passportExpiry) >= 90, issue({ id: 'PASSPORT_DATE', severity: 'warning', title: '护照有效期可能不足', materials: ['护照', '申请档案'], found: extracted.passportExpiry || '未确认', reason: '通常需要覆盖离开申根区后三个月。', action: '确认护照有效期及主申国具体要求', target: '/workspace/materials' }), !extracted.passportExpiry)
  const cities = state.itinerary.cities
  if (cities.length) {
    const dayCounts = cities.reduce<Record<string, number>>((acc, stay) => { acc[stay.country] = (acc[stay.country] || 0) + Math.max(0, diffDays(stay.checkin, stay.checkout)); return acc }, {})
    const longest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
    if (longest && longest[0] !== profile.applicationCountry) issues.push(issue({ id: 'MAIN_DESTINATION', severity: 'error', title: '主申国与最长停留国不一致', materials: ['申请档案', '行程单'], found: `主申国：${profile.applicationCountry}；最长停留：${longest[0]}（${longest[1]}晚）`, reason: '多国旅行通常应向主要目的地或最长停留国申请。', action: '调整主申国或确认实际停留计划', target: '/workspace/itinerary' }))
    else passedRules.push('主申国与最长停留国')
    const missingNight = cities.find((stay) => !stay.checkin || !stay.checkout || !stay.hotel)
    check('住宿覆盖', !missingNight, issue({ id: 'HOTEL_GAP', severity: 'error', title: '存在未覆盖的住宿信息', materials: ['住宿证明', '行程单'], found: missingNight?.city || '城市住宿信息不完整', reason: '住宿应覆盖全部计划停留夜晚。', action: '补充入住日期、离店日期和酒店', target: '/workspace/itinerary' }), false)
  } else uncheckedRules.push('住宿覆盖', '主申国与最长停留国')
  const hotelEvidence = state.extracted.hotel
  if (hotelEvidence?.checkin && hotelEvidence?.checkout) {
    check('住宿凭证覆盖旅行日期', dateMs(hotelEvidence.checkin) <= dateMs(profile.startDate) && dateMs(hotelEvidence.checkout) >= dateMs(profile.endDate), issue({ id: 'HOTEL_EVIDENCE_DATE', severity: 'error', title: '住宿凭证未覆盖完整旅行日期', materials: ['全程住宿证明', '行程单'], found: `${hotelEvidence.checkin} — ${hotelEvidence.checkout}`, reason: '已确认的住宿凭证结束日期早于返程日期。', action: '补充覆盖最后一晚的住宿凭证，并确认与行程单一致。', target: '/workspace/materials' }))
  } else uncheckedRules.push('住宿凭证日期覆盖')
  if (state.itinerary.generated && state.itinerary.days.length) passedRules.push('行程与机酒')
  else uncheckedRules.push('行程与机酒')
  if (state.coverLetter.generated) {
    const letter = `${state.coverLetter.en}\n${state.coverLetter.zh}`
    check('解释信旅行日期', letter.includes(profile.startDate) && letter.includes(profile.endDate), issue({ id: 'LETTER_DATE', severity: 'error', title: '解释信旅行日期与申请档案不一致', materials: ['解释信', '申请档案'], found: `申请档案：${profile.startDate} — ${profile.endDate}`, reason: '解释信中未包含与申请档案一致的完整旅行日期。', action: '修改解释信中的出发和返程日期。', target: '/workspace/cover-letter' }))
    const missingCity = [...new Set(cities.map((city) => city.city).filter(Boolean))].find((city) => !letter.includes(city))
    check('解释信城市一致性', !missingCity, issue({ id: 'LETTER_CITY', severity: 'error', title: '解释信遗漏行程城市', materials: ['解释信', '行程单'], found: missingCity || '行程城市未写入', reason: '解释信中的行程概述应覆盖最终行程中的主要城市。', action: '补充或更新解释信中的城市顺序。', target: '/workspace/cover-letter' }))
  } else uncheckedRules.push('解释信内容')
  const required = requirements.filter((r) => r.level === 'required')
  const covered = required.filter((r) => state.statuses[r.id] === 'uploaded' || state.statuses[r.id] === 'checked' || state.statuses[r.id] === 'done').length
  const coverage = Math.round((covered / Math.max(required.length, 1)) * 100)
  required.filter((r) => !state.statuses[r.id] || state.statuses[r.id] === 'todo').forEach((r) => issues.push(issue({ id: `MISSING_${r.id}`, severity: 'error', title: `缺少必需材料：${r.name}`, materials: [r.name], found: '未上传或未确认', reason: `${r.channel === 'online' ? '线上提交' : r.channel === 'onsite' ? '现场携带' : '线上与现场均需'}，目前没有完成状态。`, action: '前往材料清单上传或勾选', target: '/workspace/materials' })))
  return { createdAt: new Date().toISOString(), coverage, issues, passedRules, uncheckedRules }
}

export function generateDays(state: AppState): ItineraryDay[] {
  const profile = state.profile
  if (!profile) return []
  const cities = state.itinerary.cities.filter((c) => c.city && c.checkin && c.checkout)
  const days: ItineraryDay[] = []
  const cityPlans: Record<string, Array<[string, string]>> = {
    paris: [
      ['抵达后办理入住；傍晚在塞纳河沿岸、拉丁区步行。', 'Arrive, check in, and take an evening walk along the Seine and through the Latin Quarter.'],
      ['参观卢浮宫与杜乐丽花园；下午游览协和广场和香榭丽舍大街。', 'Visit the Louvre Museum and Tuileries Garden, followed by Place de la Concorde and Champs-Élysées.'],
      ['参观埃菲尔铁塔、战神广场和奥赛博物馆；傍晚前往蒙马特。', 'Visit the Eiffel Tower, Champ de Mars, and Musée d’Orsay, followed by an evening in Montmartre.'],
    ],
    barcelona: [
      ['抵达后办理入住；在哥特区和兰布拉大道步行。', 'Arrive, check in, and explore the Gothic Quarter and La Rambla on foot.'],
      ['参观圣家堂、巴特罗之家和格拉西亚大道。', 'Visit Sagrada Família, Casa Batlló, and Passeig de Gràcia.'],
      ['游览桂尔公园和海滨区域；安排自由活动时间。', 'Visit Park Güell and the waterfront, with time for independent exploration.'],
    ],
    madrid: [
      ['抵达后办理入住；步行游览太阳门广场和马约尔广场。', 'Arrive, check in, and walk through Puerta del Sol and Plaza Mayor.'],
      ['参观普拉多博物馆、丽池公园和阿尔卡拉门。', 'Visit the Prado Museum, Retiro Park, and Puerta de Alcalá.'],
      ['游览皇宫与德波神庙周边，预留购物及返程整理时间。', 'Visit the Royal Palace and Temple of Debod area, leaving time for shopping and departure preparation.'],
    ],
    rome: [
      ['抵达后办理入住；游览特莱维喷泉与西班牙广场。', 'Arrive, check in, and visit the Trevi Fountain and Spanish Steps.'],
      ['参观斗兽场、古罗马广场和帕拉蒂尼山。', 'Visit the Colosseum, Roman Forum, and Palatine Hill.'],
      ['参观梵蒂冈博物馆、圣彼得大教堂与台伯河沿岸。', 'Visit the Vatican Museums, St. Peter’s Basilica, and the Tiber riverfront.'],
    ],
  }
  cities.forEach((stay, index) => {
    const nights = Math.max(1, diffDays(stay.checkin, stay.checkout))
    for (let offset = 0; offset < nights; offset++) {
      const date = new Date(dateMs(stay.checkin) + offset * 86400000).toISOString().slice(0, 10)
      const plan = cityPlans[stay.city.toLowerCase()]?.[offset % 3] || (offset === 0 ? [`抵达${stay.city}、办理入住并在市中心步行。`, `Arrive in ${stay.city}, check in, and explore the city centre on foot.`] : [`安排${stay.city}的文化景点与街区步行活动。`, `Plan cultural visits and neighbourhood walks in ${stay.city}.`])
      const isArrival = offset === 0 && index === 0
      const isTransfer = offset === 0 && index > 0
      days.push({ date, city: stay.city, transport: isTransfer ? `城市间交通：${cities[index - 1].city} → ${stay.city}（火车／航班待确认）` : isArrival ? `去程航班：${profile.departureCity} → ${stay.city}（航班待确认）` : '市内交通：步行／地铁／公交', hotel: stay.hotel || '待补充真实住宿', activityZh: plan[0], activityEn: plan[1], bookingNote: isArrival || isTransfer ? '请补充实际航班／车次及预订编号' : '请补充真实酒店确认号或活动预约信息' })
    }
  })
  if (days.length) { days[days.length - 1].transport = `回程航班：${days[days.length - 1].city} → ${profile.returnCity}（航班待确认）`; days[days.length - 1].bookingNote = '请补充返程航班号及预订编号' }
  return days
}

export function generateLetter(state: AppState, style: 'formal' | 'concise' | 'explanatory', emphasis: string[], special: string) {
  const p = state.profile
  const stays = state.itinerary.cities.filter((city) => city.city).map((city) => `${city.city}${city.checkin && city.checkout ? ` (${city.checkin} – ${city.checkout})` : ''}`)
  const cities = stays.length ? stays.join(', ') : 'the planned destinations'
  const affiliation = p?.schoolOrEmployer ? `I am currently studying or working at ${p.schoolOrEmployer}.` : ''
  const purpose = special.trim() ? ` I would also like to clarify: ${special.trim()}.` : ''
  const focus = emphasis.includes('财力能力') ? ' I have arranged the financial evidence supporting this trip.' : ''
  const en = `To: Visa Officer\nSubject: Short-stay Schengen visa application – tourism\n\nDear Visa Officer,\n\nMy name is ${p?.name || '[Applicant name]'}. I am writing in support of my application for a short-stay Schengen visa for tourism. My intended travel period is ${p?.startDate || '[start date]'} to ${p?.endDate || '[end date]'}.\n\nTravel plan\nDuring this trip, I plan to visit ${cities}. My day-by-day itinerary, transport arrangements and accommodation information have been prepared to reflect this route.\n\nFinancial arrangements\nThe trip will be funded by ${p?.fundingSource || '[funding source]'}.${focus}\n\nReasons to return\n${affiliation} I will return to ${p?.returnCity || '[return city]'} after the visit because ${p?.returnReason || '[return reason]'}.${purpose}\n\nI confirm that the information and supporting documents submitted with this application are true and complete. Thank you for considering my application.\n\nYours faithfully,\n${p?.name || '[Applicant name]'}`
  const zh = `致：签证官\n主题：短期申根旅游签证申请说明\n\n尊敬的签证官：\n\n我叫${p?.name || '[申请人姓名]'}，现就短期申根旅游签证申请提交说明。我的计划旅行时间为${p?.startDate || '[出发日期]'}至${p?.endDate || '[返回日期]'}。\n\n一、旅行计划\n本次旅行拟前往${cities}。我已按照该路线整理逐日行程、交通安排及住宿信息。\n\n二、旅行资金\n本次旅行费用将由${p?.fundingSource || '[资金来源]'}承担。${emphasis.includes('财力能力') ? '我已准备相应的资金支持材料。' : ''}\n\n三、返程安排\n${p?.schoolOrEmployer ? `我目前就读或任职于${p.schoolOrEmployer}。` : ''}旅行结束后，我将返回${p?.returnCity || '[返回城市]'}，原因是${p?.returnReason || '[返程理由]'}。${special.trim() ? `另就特殊情况说明如下：${special.trim()}。` : ''}\n\n我确认本申请所提交的信息及支持材料真实、完整。感谢审阅我的申请。\n\n此致\n敬礼\n${p?.name || '[申请人姓名]'}`
  return { style, emphasis, special, en, zh, generated: true }
}
