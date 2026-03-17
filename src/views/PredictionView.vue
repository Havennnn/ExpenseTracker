<script setup>
import { computed, onMounted, ref } from 'vue'
import { getPrediction } from '../lib/db'
import { formatCurrency } from '../lib/utils'

const userId = localStorage.getItem('userId')

const isLoading = ref(true)
const error = ref('')
const prediction = ref(null)

const outlookLabel = computed(() => {
  if (!prediction.value) return ''
  return prediction.value.willLast ? 'Likely to hold' : 'Likely to run short'
})

const outlookTone = computed(() => {
  if (!prediction.value) return 'text-zinc-100'
  return prediction.value.willLast ? 'text-zinc-100' : 'text-red-300'
})

const runwayDelta = computed(() => {
  if (!prediction.value) return 0
  return prediction.value.currentBalance - prediction.value.projected15DayExpense
})

async function loadPrediction() {
  isLoading.value = true
  error.value = ''

  try {
    prediction.value = await getPrediction(userId)
  } catch (e) {
    console.error('Error loading prediction:', e)
    error.value = e.message || 'Failed to load prediction'
    prediction.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPrediction)
</script>

<template>
  <div class="pb-24">
    <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div class="mx-auto max-w-sm px-4 py-4">
        <h1 class="text-xl font-semibold text-zinc-100">15-Day Outlook</h1>
        <p class="text-xs text-zinc-500">Simple forecast based on your current spending pace</p>
      </div>
    </header>

    <main class="mx-auto max-w-sm px-4 py-4 space-y-4">
      <div v-if="isLoading" class="space-y-4 animate-pulse">
        <div class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div class="h-3 w-24 rounded-full bg-zinc-800"></div>
          <div class="h-10 w-40 rounded-full bg-zinc-800"></div>
          <div class="h-16 rounded-2xl bg-zinc-800"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="h-28 rounded-2xl border border-zinc-800 bg-zinc-900"></div>
          <div class="h-28 rounded-2xl border border-zinc-800 bg-zinc-900"></div>
          <div class="h-28 rounded-2xl border border-zinc-800 bg-zinc-900"></div>
          <div class="h-28 rounded-2xl border border-zinc-800 bg-zinc-900"></div>
        </div>
        <div class="h-24 rounded-2xl border border-zinc-800 bg-zinc-900"></div>
      </div>

      <div v-else-if="error" class="rounded-2xl border border-rose-950 bg-rose-950/20 p-5 text-center text-sm text-rose-200">
        {{ error }}
      </div>

      <div v-else-if="!prediction" class="py-10 text-center text-zinc-500">
        No prediction data available.
      </div>

      <template v-else>
        <section class="rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <p class="text-sm text-zinc-500">15-day projection</p>
            <p class="mt-1 text-3xl font-semibold" :class="outlookTone">{{ outlookLabel }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Runway after 15 days</p>
              <p class="mt-2 text-2xl font-semibold" :class="runwayDelta >= 0 ? 'text-zinc-100' : 'text-red-300'">
                {{ formatCurrency(runwayDelta) }}
              </p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Days tracked</p>
              <p class="mt-2 text-2xl font-semibold text-zinc-100">{{ prediction.daysElapsed }}</p>
            </div>
          </div>

          <p class="text-sm leading-6 text-zinc-300">
            {{ prediction.willLast ? 'Your current balance should absorb the next 15 days at your current pace.' : 'At the current pace, your balance may not cover the next 15 days.' }}
          </p>
        </section>

        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Current balance</p>
            <p class="mt-2 text-xl font-semibold text-zinc-100">{{ formatCurrency(prediction.currentBalance) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Projected 15 days</p>
            <p class="mt-2 text-xl font-semibold text-zinc-100">{{ formatCurrency(prediction.projected15DayExpense) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Daily burn</p>
            <p class="mt-2 text-xl font-semibold text-zinc-100">{{ formatCurrency(prediction.averageDailyExpense) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Month progress</p>
            <p class="mt-2 text-xl font-semibold text-zinc-100">{{ prediction.daysElapsed }} days</p>
          </div>
        </section>

        <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Observed month data</p>
          <div class="mt-4 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-zinc-400">Income</span>
              <span class="font-medium text-zinc-100">{{ formatCurrency(prediction.totalIncomeSoFar) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-zinc-400">Expenses</span>
              <span class="font-medium text-zinc-100">{{ formatCurrency(prediction.totalExpensesSoFar) }}</span>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
