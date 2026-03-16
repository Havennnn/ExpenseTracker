<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="max-w-sm mx-auto px-4 py-6 space-y-6" aria-hidden="true">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <SkeletonBlock class="h-4 w-20" />
      <SkeletonBlock class="h-10 w-40" />
      <SkeletonBlock class="h-3 w-32" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <SkeletonBlock class="h-3 w-14" />
        <SkeletonBlock class="h-7 w-20" />
      </div>
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <SkeletonBlock class="h-3 w-16" />
        <SkeletonBlock class="h-7 w-20" />
      </div>
    </div>

    <div class="space-y-3">
      <SkeletonBlock class="h-4 w-16" />
      <div
        v-for="item in 4"
        :key="item"
        class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <SkeletonBlock class="h-4 flex-1" />
          <SkeletonBlock class="h-4 w-16" />
        </div>
        <SkeletonBlock class="h-3 w-28" />
      </div>
    </div>
  </div>
</template>
