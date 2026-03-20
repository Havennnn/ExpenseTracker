import { getExpenses, getPlan } from './db'

const BUDGET_MASCOT_EVENT = 'budget-mascot'

const BUDGET_MASCOT_STAGES = [
  {
    image: 'Concern.png',
    tone: 'concern',
    lines: [
      'Sobra ka na sa budget mo',
      'Tama na yan ahh, lagpas ka na sa budget mo',
      'Tigil ka na muna sa gastos'
    ]
  },
  {
    image: 'Annoyed.png',
    tone: 'annoyed',
    lines: [
      'Sinabihan na kita, tumigil ka na sa gastos',
      'Pag ikaw nawalan ng budget jan yari ka sakin',
      'Tumigil ka na sa gastos kala mo talaga kay yaman'
    ]
  },
  {
    image: 'Angry.png',
    tone: 'angry',
    lines: [
      'Ang gastos gastos mo tumigil ka na last mo na yan hindi ka na pwede pa gumastos',
      'Panay ka gastos humanda ka talaga ka ngayon sakin hindi ka tumitigil sa kakagastos',
      'Wag mo ako kakausapin, sinabihan kita na tumigil na kakagastos'
    ]
  }
]

const INCOME_MASCOT_REACTIONS = {
  image: 'Amaze.png',
  tone: 'amaze',
  lines: [
    'Ang sarap mag trabaho',
    'Ang saya saya mabuhay',
    'Gusto ko na ulit pumasok',
    'Nakakagana pumasok yeheyy',
    'Aba may pera, good job ka today',
    'Yan ang gusto ko, pasok ng pasok ang income'
  ]
}

const NATURAL_NO_PLAN_REACTION = {
  image: 'Natural.png',
  tone: 'natural',
  lines: [
    'Gawa ka ng plan para may guide ka sa gastos',
    'Okay lang yan, pero mas maganda kung may budget plan tayo',
    'Lagyan natin ng plan para mas kontrolado ang gastos mo',
    'Wala ka pang plan, gusto mo ayusin natin budget mo?'
  ]
}

const NATURAL_ON_TRACK_REACTION = {
  image: 'Natural.png',
  tone: 'natural',
  lines: [
    'Okay pa yan, pasok ka pa sa budget',
    'Ayos lang, kontrolado pa ang gastos mo',
    'Goods pa tayo, within budget ka pa',
    'Sakto lang, kaya pa ng budget mo yan'
  ]
}

const PLAN_CREATED_REACTION = {
  image: 'Natural.png',
  tone: 'natural',
  lines: [
    'Ayan, ganyan dapat tama yan desisyon mo na yan sa buhay',
    'Siguraduhin mong makakaipon ka lang talaga ahh',
    'Kala mo talaga makakaipon'
  ]
}

const WAVE_REACTION = {
  image: 'Wave.png',
  tone: 'wave',
  lines: [
    'Hi, ako si Piya',
    'Ready na ba tayo mag track today?',
    'Balik tayo sa budget ha',
    'Sige, simulan ulit natin today'
  ]
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function getBreachStorageKey(userId, date) {
  return `budget-breach:${userId}:${date}`
}

function getWaveStorageKey(userId, date) {
  return `budget-wave:${userId}:${date}`
}

function getRandomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)]
}

function dispatchMascot(detail, delay = 1000) {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(BUDGET_MASCOT_EVENT, {
      detail
    }))
  }, delay)
}

export function getBudgetMascotEventName() {
  return BUDGET_MASCOT_EVENT
}

export function triggerWaveMascotOncePerDay(userId) {
  const today = getTodayKey()
  if (!userId) {
    return
  }

  const waveKey = getWaveStorageKey(userId, today)
  if (localStorage.getItem(waveKey)) {
    return
  }

  localStorage.setItem(waveKey, '1')
  dispatchMascot({
    ...WAVE_REACTION,
    line: getRandomLine(WAVE_REACTION.lines)
  }, 400)
}

export async function evaluateBudgetMascot(userId, expenseDate) {
  const targetDate = String(expenseDate || '').trim()
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return
  }

  const plan = await getPlan(userId)
  if (!plan?.planExists) {
    dispatchMascot({
      ...NATURAL_NO_PLAN_REACTION,
      line: getRandomLine(NATURAL_NO_PLAN_REACTION.lines)
    })
    return
  }

  if (Array.isArray(plan.selectedDates) && plan.selectedDates.length > 0 && !plan.selectedDates.includes(targetDate)) {
    return
  }

  if (
    plan.cycle?.cycleStart &&
    plan.cycle?.cycleEnd &&
    (targetDate < plan.cycle.cycleStart || targetDate > plan.cycle.cycleEnd)
  ) {
    return
  }

  const dailyBudget = Number(plan.dailyBudget || 0)
  if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
    return
  }

  const expensesResult = await getExpenses(userId, targetDate, targetDate, '', 100, 0)
  const totalSpentToday = (expensesResult.expenses || []).reduce((sum, item) => {
    return sum + Number(item.amount || 0)
  }, 0)

  if (totalSpentToday <= dailyBudget) {
    dispatchMascot({
      ...NATURAL_ON_TRACK_REACTION,
      line: getRandomLine(NATURAL_ON_TRACK_REACTION.lines)
    })
    return
  }

  const breachKey = getBreachStorageKey(userId, targetDate)
  const nextStage = Math.min(Number(localStorage.getItem(breachKey) || 0) + 1, 3)
  const stage = BUDGET_MASCOT_STAGES[nextStage - 1]

  localStorage.setItem(breachKey, String(nextStage))

  dispatchMascot({
    ...stage,
    stage: nextStage,
    line: getRandomLine(stage.lines)
  })
}

export function triggerIncomeMascot() {
  dispatchMascot({
    ...INCOME_MASCOT_REACTIONS,
    line: getRandomLine(INCOME_MASCOT_REACTIONS.lines)
  })
}

export function triggerPlanCreatedMascot() {
  dispatchMascot({
    ...PLAN_CREATED_REACTION,
    line: getRandomLine(PLAN_CREATED_REACTION.lines)
  })
}
