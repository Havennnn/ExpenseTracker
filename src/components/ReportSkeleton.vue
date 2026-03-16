<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="space-y-4" aria-hidden="true">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <SkeletonBlock class="h-4 w-28" />
      <SkeletonBlock class="h-9 w-32" />
      <SkeletonBlock class="h-3 w-20" />
      <div class="grid grid-cols-2 gap-3 pt-1">
        <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <SkeletonBlock class="h-3 w-14" />
          <SkeletonBlock class="h-7 w-20" />
          <SkeletonBlock class="h-3 w-16" />
        </div>
        <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <SkeletonBlock class="h-3 w-16" />
          <SkeletonBlock class="h-7 w-20" />
          <SkeletonBlock class="h-3 w-16" />
        </div>
      </div>
    </div>

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <SkeletonBlock class="h-4 w-32" />
        <SkeletonBlock class="h-3 w-16" />
      </div>
      <div
        v-for="item in 3"
        :key="`expense-${item}`"
        class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <SkeletonBlock class="h-4 flex-1" />
          <SkeletonBlock class="h-4 w-16" />
        </div>
        <SkeletonBlock class="h-3 w-24" />
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <SkeletonBlock class="h-4 w-28" />
        <SkeletonBlock class="h-3 w-16" />
      </div>
      <div
        v-for="item in 3"
        :key="`income-${item}`"
        class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <SkeletonBlock class="h-4 flex-1" />
          <SkeletonBlock class="h-4 w-16" />
        </div>
        <SkeletonBlock class="h-3 w-24" />
      </div>
    </section>
  </div>
</template>
