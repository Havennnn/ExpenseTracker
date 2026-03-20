<script setup>
import { computed, onMounted, ref } from 'vue'
import { getPlan, resetPlan, savePlan } from '../lib/db'
import { formatCurrency } from '../lib/utils'

const userId = localStorage.getItem('userId')

const isLoading = ref(true)
const isSaving = ref(false)
const plan = ref(null)
const targetPercent = ref(20)
const skeletonMode = ref(localStorage.getItem('planSkeletonMode') || 'create')

// Date selection
const dateRangeType = ref('default') // 'default', 'weekdays', 'custom'
const customDates = ref([])

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

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
  localStorage.setItem('planSkeletonMode', mode)
}

async function loadPlan() {
  isLoading.value = true

  try {
    let result
    if (dateRangeType.value === 'default') {
      result = await getPlan(userId)
    } else {
      let startDate = null
      let endDate = null

      if (dateRangeType.value === 'weekdays') {
        // Weekdays only
        const today = new Date()
        startDate = formatDate(today)
        
        // Calculate end date as next Friday if today is Monday-Thursday, or this Friday if today is Friday-Monday
        let daysUntilFriday = (5 - today.getDay() + 7) % 7
        if (daysUntilFriday === 0) daysUntilFriday = 7 // If today is Friday, set to next Friday
        endDate = formatDate(new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000))
        result = await getPlan(userId, startDate, endDate)
      } else if (dateRangeType.value === 'custom') {
        // Custom dates
        result = await getPlan(userId, null, null, customDates.value)
      }
    }

    plan.value = result
    targetPercent.value = Number(result.targetSavingsPercent ?? result.suggestedPercent ?? 20)
    setSkeletonMode(result.planExists ? 'plan' : 'create')
  } catch (e) {
    console.error('Error loading budget plan:', e)
    plan.value = null
  } finally {
    isLoading.value = false
  }
}

async function handleGenerate() {
  if (isSaving.value) return
  isSaving.value = true

  try {
    if (dateRangeType.value === 'default') {
      await savePlan(userId, Number(targetPercent.value))
    } else {
      let startDate = null
      let endDate = null

      if (dateRangeType.value === 'weekdays') {
        // Weekdays only
        const today = new Date()
        startDate = formatDate(today)
        
        // Calculate end date as next Friday if today is Monday-Thursday, or this Friday if today is Friday-Monday
        let daysUntilFriday = (5 - today.getDay() + 7) % 7
        if (daysUntilFriday === 0) daysUntilFriday = 7 // If today is Friday, set to next Friday
        endDate = formatDate(new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000))
        await savePlan(userId, Number(targetPercent.value), startDate, endDate)
      } else if (dateRangeType.value === 'custom') {
        // Custom dates
        await savePlan(userId, Number(targetPercent.value), null, null, customDates.value)
      }
    }

    await loadPlan()
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
    await resetPlan(userId)
    await loadPlan()
  } catch (e) {
    console.error('Error resetting budget plan:', e)
    alert(e.message || 'Failed to reset plan')
  } finally {
    isSaving.value = false
  }
}

function generateNextDays(days) {
  const dates = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(formatDate(date))
  }
  return dates
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

onMounted(loadPlan)
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
              <label class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:bg-zinc-850">
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="default"
                  class="h-4 w-4 cursor-pointer accent-zinc-100"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Full Month</p>
                  <p class="text-xs text-zinc-500">Applies to the entire current month</p>
                </div>
              </label>

              <label class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:bg-zinc-850">
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="weekdays"
                  class="h-4 w-4 cursor-pointer accent-zinc-100"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Weekdays Only</p>
                  <p class="text-xs text-zinc-500">Monday to Friday (excludes weekends)</p>
                </div>
              </label>

              <label class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:bg-zinc-850">
                <input
                  v-model="dateRangeType"
                  type="radio"
                  value="custom"
                  class="h-4 w-4 cursor-pointer accent-zinc-100"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-zinc-100">Custom Dates</p>
                  <p class="text-xs text-zinc-500">Select specific dates for your budget</p>
                </div>
              </label>
            </div>

            <!-- Custom Dates Input -->
            <template v-if="dateRangeType === 'custom'">
              <div class="space-y-3">
                <p class="text-xs text-zinc-500">Select dates:</p>
                <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border border-zinc-800 bg-zinc-900">
                  <button
                    v-for="date in generateNextDays(30)"
                    :key="date"
                    @click="toggleDate(date)"
                    :class="[
                      'px-3 py-1 text-sm rounded-full transition-colors',
                      customDates.value.includes(date)
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    ]"
                  >
                    {{ formatDisplayDate(date) }}
                  </button>
                </div>
                <p v-if="customDates.value.length === 0" class="text-xs text-zinc-500">
                  No dates selected yet
                </p>
                <p v-else class="text-xs text-zinc-500">
                  {{ customDates.value.length }} date{{ customDates.value.length > 1 ? 's' : '' }} selected
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
