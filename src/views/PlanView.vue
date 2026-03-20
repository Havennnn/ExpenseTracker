<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getPlan, resetPlan, savePlan } from '../lib/db'
import { triggerPlanCreatedMascot } from '../lib/budgetMascot'
import { formatCurrency } from '../lib/utils'

const userId = localStorage.getItem('userId')
const PLAN_CACHE_KEY = userId ? `plan-view:${userId}` : 'plan-view'

const isLoading = ref(true)
const isSaving = ref(false)
const plan = ref(null)
const targetPercent = ref(20)
const skeletonMode = ref('create')
const selectedPlanDates = ref([])
const selectedPlanType = ref('default')

// Date selection
const dateRangeType = ref('default') // 'default', 'weekdays', 'custom'
const customDates = ref([])

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function getCurrentBudgetWindow() {
  const today = new Date()
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const cycleEnd = today.getDate() <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 15)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return {
    start: currentDate,
    end: cycleEnd,
  }
}

function generateWeekdaysUntilMonthEnd() {
  const dates = []
  const { start, end } = getCurrentBudgetWindow()

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(formatDate(new Date(date)))
    }
  }

  return dates
}

const budgetWindow = computed(() => getCurrentBudgetWindow())

const calendarDays = computed(() => {
  const { start, end } = budgetWindow.value
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
  const days = []

  for (let i = 0; i < monthStart.getDay(); i++) {
    days.push(null)
  }

  for (let day = 1; day <= end.getDate(); day++) {
    const date = new Date(start.getFullYear(), start.getMonth(), day)
    const dateKey = formatDate(date)
    const isSelectable = date >= start && date <= end

    days.push({
      key: dateKey,
      label: day,
      selectable: isSelectable,
    })
  }

  return days
})

const customWindowLabel = computed(() => {
  const { start, end } = budgetWindow.value
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startLabel} to ${endLabel}`
})

const sliderSavingsAmount = computed(() => {
  const balance = Number(plan.value?.currentBalance || 0)
  return balance > 0 ? balance * (Number(targetPercent.value) / 100) : 0
})

const dailyBudgetTone = computed(() => {
  if (plan.value?.dailyBudget > 0) return 'text-emerald-400'
  if (plan.value?.dailyBudget === 0) return 'text-amber-400'
  return 'text-red-400'
})

function setSkeletonMode(mode) {
  skeletonMode.value = mode
}

function buildPlanState(result) {
  const resolvedPlanType = result?.planType || selectedPlanType.value
  const resolvedSelectedDates = Array.isArray(result?.selectedDates)
    ? [...result.selectedDates]
    : [...selectedPlanDates.value]

  return {
    ...result,
    selectedDates: resolvedSelectedDates,
    selectedPlanType: resolvedPlanType,
  }
}

function syncSelectionFromPlan(result) {
  const savedPlanType = result?.planType || 'default'
  const savedDates = Array.isArray(result?.selectedDates) ? [...result.selectedDates] : []

  dateRangeType.value = savedPlanType
  customDates.value = savedPlanType === 'custom' ? savedDates : []
  selectedPlanType.value = savedPlanType
  selectedPlanDates.value = savedDates
}

function persistPlanCache() {
  if (!userId) return

  const payload = {
    plan: plan.value,
    targetPercent: targetPercent.value,
    dateRangeType: dateRangeType.value,
    customDates: [...customDates.value],
    skeletonMode: skeletonMode.value,
  }

  sessionStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(payload))
}

function hydratePlanCache() {
  if (!userId) return false

  const raw = sessionStorage.getItem(PLAN_CACHE_KEY)
  if (!raw) return false

  try {
    const cached = JSON.parse(raw)
    if (cached?.plan) {
      plan.value = cached.plan
      targetPercent.value = Number(cached.targetPercent ?? cached.plan.targetSavingsPercent ?? cached.plan.suggestedPercent ?? 20)
      dateRangeType.value = cached.dateRangeType || cached.plan.selectedPlanType || 'default'
      customDates.value = Array.isArray(cached.customDates) ? cached.customDates : []
      skeletonMode.value = cached.skeletonMode || (cached.plan.planExists ? 'plan' : 'create')
      selectedPlanType.value = cached.plan.selectedPlanType || 'default'
      selectedPlanDates.value = Array.isArray(cached.plan.selectedDates) ? cached.plan.selectedDates : []
      isLoading.value = false
      return true
    }
  } catch (error) {
    sessionStorage.removeItem(PLAN_CACHE_KEY)
  }

  return false
}

function clearPlanCache() {
  if (!userId) return
  sessionStorage.removeItem(PLAN_CACHE_KEY)
}

function getCurrentSelectionDates() {
  if (dateRangeType.value === 'weekdays') {
    return generateWeekdaysUntilMonthEnd()
  }

  if (dateRangeType.value === 'custom') {
    return [...customDates.value].sort()
  }

  return []
}

function syncPlanSelection() {
  selectedPlanType.value = dateRangeType.value
  selectedPlanDates.value = getCurrentSelectionDates()
}

function formatPlanDateList(dates) {
  return dates.map((date) => {
    const value = new Date(date)
    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
}

async function loadPlan() {
  const hasCachedPlan = Boolean(plan.value)
  setSkeletonMode(plan.value?.planExists ? 'plan' : skeletonMode.value)
  isLoading.value = !hasCachedPlan

  try {
    syncPlanSelection()
    let result
    if (dateRangeType.value === 'default') {
      result = await getPlan(userId)
    } else {
      if (dateRangeType.value === 'weekdays') {
        result = await getPlan(userId, null, null, generateWeekdaysUntilMonthEnd())
      } else if (dateRangeType.value === 'custom') {
        result = await getPlan(userId, null, null, customDates.value)
      }
    }

    syncSelectionFromPlan(result)
    plan.value = buildPlanState(result)
    targetPercent.value = Number(result.targetSavingsPercent ?? result.suggestedPercent ?? 20)
    setSkeletonMode(result.planExists ? 'plan' : 'create')
    persistPlanCache()
  } catch (e) {
    console.error('Error loading budget plan:', e)
    if (!hasCachedPlan) {
      plan.value = null
    }
  } finally {
    isLoading.value = false
  }
}

async function handleGenerate() {
  if (isSaving.value) return
  isSaving.value = true

  try {
    if (dateRangeType.value === 'default') {
      await savePlan(userId, Number(targetPercent.value), null, null, null, 'default')
    } else {
      if (dateRangeType.value === 'weekdays') {
        await savePlan(userId, Number(targetPercent.value), null, null, generateWeekdaysUntilMonthEnd(), 'weekdays')
      } else if (dateRangeType.value === 'custom') {
        await savePlan(userId, Number(targetPercent.value), null, null, customDates.value, 'custom')
      }
    }

    await loadPlan()
    triggerPlanCreatedMascot()
  } catch (e) {
    console.error('Error generating budget plan:', e)
    alert(e.message || 'Failed to generate plan')
  } finally {
    isSaving.value = false
  }
}

async function handleReset() {
  if (isSaving.value) return
  isSaving.value = true

  try {
    setSkeletonMode('create')
    dateRangeType.value = 'default'
    customDates.value = []
    selectedPlanDates.value = []
    selectedPlanType.value = 'default'
    clearPlanCache()
    await resetPlan(userId)
    await loadPlan()
  } catch (e) {
    console.error('Error resetting budget plan:', e)
    alert(e.message || 'Failed to reset plan')
  } finally {
    isSaving.value = false
  }
}

function toggleDate(date) {
  const index = customDates.value.indexOf(date)
  if (index > -1) {
    customDates.value.splice(index, 1)
  } else {
    customDates.value.push(date)
    customDates.value.sort()
  }
}

watch(dateRangeType, (nextType) => {
  if (nextType !== 'custom') {
    customDates.value = []
    return
  }

  const { start, end } = budgetWindow.value
  customDates.value = customDates.value.filter((date) => {
    const value = new Date(date)
    return value >= start && value <= end
  })
})

watch(
  [plan, targetPercent, dateRangeType, customDates],
  () => {
    if (plan.value) {
      persistPlanCache()
    }
  },
  { deep: true }
)

onMounted(() => {
  hydratePlanCache()
  loadPlan()
})
</script>

<template>
  <div class="pb-24">
    <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div class="mx-auto max-w-sm px-4 py-4">
        <h1 class="text-xl font-semibold text-zinc-100">Budget</h1>
        <p class="text-xs text-zinc-500">Set a savings target, then generate a daily budget plan</p>
      </div>
    </header>

    <main class="mx-auto max-w-sm px-4 py-4 space-y-4">
      <div v-if="isLoading" class="space-y-3">
        <template v-if="skeletonMode === 'plan'">
          <div class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-4 animate-pulse">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-2">
                <div class="h-3 w-28 rounded-full bg-zinc-800"></div>
                <div class="h-10 w-36 rounded-full bg-zinc-800"></div>
                <div class="h-3 w-20 rounded-full bg-zinc-800"></div>
              </div>
              <div class="h-10 w-24 rounded-xl bg-zinc-800"></div>
            </div>
            <div class="h-16 rounded-2xl bg-zinc-950"></div>
          </div>
          <div class="grid grid-cols-2 gap-3 animate-pulse">
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-5 animate-pulse">
            <div class="space-y-2">
              <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
              <div class="h-9 w-40 rounded-full bg-zinc-800"></div>
            </div>

            <!-- Date Range Selection Skeleton -->
            <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
              <div class="space-y-2">
                <div class="h-3 w-28 rounded-full bg-zinc-800"></div>
                <div class="h-3 w-44 rounded-full bg-zinc-800"></div>
              </div>
              <div class="space-y-3">
                <div class="h-14 rounded-xl border border-zinc-800 bg-zinc-900"></div>
                <div class="h-14 rounded-xl border border-zinc-800 bg-zinc-900"></div>
                <div class="h-14 rounded-xl border border-zinc-800 bg-zinc-900"></div>
              </div>
              <!-- Custom Dates Selection Skeleton -->
              <div class="space-y-3">
                <div class="h-3 w-20 rounded-full bg-zinc-800"></div>
                <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border border-zinc-800 bg-zinc-900">
                  <div v-for="i in 10" :key="i" class="h-6 w-20 rounded-full bg-zinc-800"></div>
                </div>
                <div class="h-3 w-40 rounded-full bg-zinc-800"></div>
              </div>
            </div>

            <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-2">
                  <div class="h-3 w-28 rounded-full bg-zinc-800"></div>
                  <div class="h-3 w-44 rounded-full bg-zinc-800"></div>
                </div>
                <div class="h-8 w-14 rounded-full bg-zinc-800"></div>
              </div>
              <div class="h-2 w-full rounded-full bg-zinc-800"></div>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
                <div class="h-6 w-32 rounded-full bg-zinc-800"></div>
              </div>
            </div>
            <div class="h-11 rounded-xl bg-zinc-800"></div>
          </div>
        </template>
      </div>

      <template v-else-if="plan && !plan.planExists">
        <section class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-5">
          <div>
            <p class="text-sm text-zinc-500">Current balance</p>
            <p class="mt-1 text-3xl font-semibold text-zinc-100">{{ formatCurrency(plan.currentBalance) }}</p>
          </div>

          <!-- Date Range Selection -->
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div>
              <p class="text-sm font-medium text-zinc-100">Budget Period</p>
              <p class="text-xs text-zinc-500">Select when your budget plan should apply</p>
            </div>

            <div class="space-y-3">
              <label
                class="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
                :class="dateRangeType === 'default' ? 'border-zinc-100 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850'"
              >
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="default"
                  class="sr-only"
                />
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full border"
                  :class="dateRangeType === 'default' ? 'border-zinc-100 bg-zinc-100' : 'border-zinc-500 bg-zinc-950'"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :class="dateRangeType === 'default' ? 'bg-zinc-900' : 'bg-transparent'"
                  ></span>
                </span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Full Month</p>
                  <p class="text-xs text-zinc-500">Applies to the entire current month</p>
                </div>
              </label>

              <label
                class="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
                :class="dateRangeType === 'weekdays' ? 'border-zinc-100 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850'"
              >
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="weekdays"
                  class="sr-only"
                />
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full border"
                  :class="dateRangeType === 'weekdays' ? 'border-zinc-100 bg-zinc-100' : 'border-zinc-500 bg-zinc-950'"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :class="dateRangeType === 'weekdays' ? 'bg-zinc-900' : 'bg-transparent'"
                  ></span>
                </span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Weekdays Only</p>
                  <p class="text-xs text-zinc-500">Monday to Friday (excludes weekends)</p>
                </div>
              </label>

              <label
                class="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
                :class="dateRangeType === 'custom' ? 'border-zinc-100 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850'"
              >
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="custom"
                  class="sr-only"
                />
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full border"
                  :class="dateRangeType === 'custom' ? 'border-zinc-100 bg-zinc-100' : 'border-zinc-500 bg-zinc-950'"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :class="dateRangeType === 'custom' ? 'bg-zinc-900' : 'bg-transparent'"
                  ></span>
                </span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Custom Dates</p>
                  <p class="text-xs text-zinc-500">Select specific dates for your budget</p>
                </div>
              </label>
            </div>

            <!-- Custom Dates Input -->
            <template v-if="dateRangeType === 'custom'">
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-zinc-400">Select dates from {{ customWindowLabel }}</p>
                  <p class="mt-1 text-xs text-zinc-500">Dates before today and outside the current cycle are disabled.</p>
                </div>
                <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                  <div class="mb-3 flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-100">
                      {{ budgetWindow.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
                    </p>
                    <p class="text-xs text-zinc-500">Current cycle only</p>
                  </div>
                  <div class="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-zinc-500">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>
                  <div class="grid grid-cols-7 gap-1">
                    <template v-for="(day, index) in calendarDays" :key="day?.key || `empty-${index}`">
                      <div
                        v-if="!day"
                        class="h-10 rounded-lg"
                      ></div>
                      <button
                        v-else
                        type="button"
                        @click="day.selectable && toggleDate(day.key)"
                        :disabled="!day.selectable"
                        :class="[
                          'h-10 rounded-lg text-sm transition-colors',
                          customDates.includes(day.key)
                            ? 'bg-zinc-100 font-medium text-zinc-900'
                            : day.selectable
                              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                              : 'cursor-not-allowed bg-zinc-950 text-zinc-600'
                        ]"
                      >
                        {{ day.label }}
                      </button>
                    </template>
                  </div>
                </div>
                <p v-if="customDates.length === 0" class="text-xs text-zinc-500">
                  No dates selected yet
                </p>
                <p v-else class="text-xs text-zinc-500">
                  {{ customDates.length }} date{{ customDates.length > 1 ? 's' : '' }} selected
                </p>
              </div>
            </template>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-zinc-100">Savings target</p>
                <p class="text-xs text-zinc-500">How much of your current balance you want to keep</p>
              </div>
              <div class="rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-100">
                {{ targetPercent }}%
              </div>
            </div>

            <input
              v-model="targetPercent"
              type="range"
              min="0"
              max="100"
              step="1"
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-100"
              style="touch-action: pan-x;"
            />

            <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p class="text-xs text-zinc-500">You want to save</p>
              <p class="mt-1 text-xl font-semibold text-emerald-400">{{ formatCurrency(sliderSavingsAmount) }}</p>
            </div>
          </div>

          <button
            @click="handleGenerate"
            :disabled="isSaving"
            class="h-11 w-full rounded-xl bg-zinc-100 text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isSaving ? 'Generating...' : 'Generate Daily Budget Plan' }}
          </button>
        </section>
      </template>

      <template v-else-if="plan">
        <section class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-zinc-500">{{ plan.cycle.budgetLabel }}</p>
              <p class="mt-1 text-3xl font-semibold" :class="dailyBudgetTone">{{ formatCurrency(plan.dailyBudget) }}</p>
              <p class="text-xs text-zinc-500">daily budget</p>
            </div>
            <button
              @click="handleReset"
              :disabled="isSaving"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 0018.36 5.64M18.36 18.36A9 9 0 015.64 5.64" />
              </svg>
              {{ isSaving ? 'Resetting...' : 'Reset Plan' }}
            </button>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p class="text-xs text-zinc-500">{{ plan.cycle.cycleLabel }}</p>
            <p class="mt-1 text-sm text-zinc-300">{{ plan.message }}</p>
          </div>

          <div
            v-if="plan.selectedPlanType !== 'default' && plan.selectedDates?.length"
            class="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <p class="text-xs text-zinc-500">
              {{ plan.selectedPlanType === 'weekdays' ? 'Weekday dates in this plan' : 'Selected custom dates' }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="date in formatPlanDateList(plan.selectedDates)"
                :key="date"
                class="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200"
              >
                {{ date }}
              </span>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Current balance</p>
            <p class="mt-1 text-lg font-semibold text-zinc-100">{{ formatCurrency(plan.currentBalance) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Savings target</p>
            <p class="mt-1 text-lg font-semibold text-emerald-400">{{ formatCurrency(plan.targetSavingsAmount) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Spendable amount</p>
            <p class="mt-1 text-lg font-semibold text-zinc-100">{{ formatCurrency(plan.spendableAmount) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Spent this window</p>
            <p class="mt-1 text-lg font-semibold text-red-400">{{ formatCurrency(plan.cycleExpenses) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Remaining budget</p>
            <p class="mt-1 text-lg font-semibold" :class="plan.remainingBudget >= 0 ? 'text-zinc-100' : 'text-red-400'">
              {{ formatCurrency(plan.remainingBudget) }}
            </p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Days left</p>
            <p class="mt-1 text-lg font-semibold text-zinc-100">{{ plan.cycle.daysLeft }}</p>
          </div>
        </section>
      </template>

      <div v-else class="py-10 text-center text-zinc-500">
        Unable to load your budget.
      </div>
    </main>
  </div>
</template>
