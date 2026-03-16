<script setup>
defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div
    class="animate-pulse rounded-md bg-zinc-800/80"
    :class="$props.class"
    aria-hidden="true"
  />
</template>
