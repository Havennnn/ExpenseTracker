<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

defineProps({
  rows: {
    type: Number,
    default: 5
  },
  showMonthHeader: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <div class="space-y-3 px-4" aria-hidden="true">
    <SkeletonBlock v-if="showMonthHeader" class="h-4 w-24" />
    <div
      v-for="row in rows"
      :key="row"
      class="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
    >
      <div class="flex items-center justify-between gap-3">
        <SkeletonBlock class="h-4 flex-1" />
        <SkeletonBlock class="h-4 w-16" />
      </div>
      <div class="mt-3 flex items-center justify-between gap-3">
        <SkeletonBlock class="h-3 w-28" />
        <SkeletonBlock class="h-4 w-4 rounded" />
      </div>
    </div>
  </div>
</template>
