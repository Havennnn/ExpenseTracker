<script setup>
defineProps({
  activeTab: {
    type: String,
    default: 'home'
  }
})

const emit = defineEmits(['change'])

const tabs = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'expenses', label: 'Expenses', icon: 'expense' },
  { id: 'income', label: 'Income', icon: 'income' },
  { id: 'categories', label: 'Categories', icon: 'category' },
  { id: 'reports', label: 'Reports', icon: 'report' },
  { id: 'plan', label: 'Budget', icon: 'plan' }
]
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
    <div class="mx-auto grid max-w-sm grid-cols-6 px-2 py-2">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="emit('change', tab.id)"
        class="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors"
        :class="activeTab === tab.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
      >
        <svg v-if="tab.icon === 'home'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <svg v-else-if="tab.icon === 'expense'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <svg v-else-if="tab.icon === 'income'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="tab.icon === 'category'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <svg v-else-if="tab.icon === 'report'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6m3 6V7m3 10v-3M9 3h6a2 2 0 012 2v14l-5-3-5 3V5a2 2 0 012-2z" />
        </svg>
        <svg v-else-if="tab.icon === 'plan'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span class="max-w-full truncate text-[10px]">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
