<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BulkActionsBar from '../components/BulkActionsBar.vue'
import CategoryForm from '../components/CategoryForm.vue'
import DeleteModal from '../components/DeleteModal.vue'
import FilterBar from '../components/FilterBar.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import { createCategory, deleteCategory, getCategories } from '../lib/db'

const props = defineProps({
  refreshTrigger: Number
})

const emit = defineEmits(['refresh'])

const categories = ref([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isSaving = ref(false)
const showAddForm = ref(false)
const showDeleteModal = ref(false)
const searchQuery = ref('')
const deleteItemId = ref(null)
const selectedItems = ref([])
const isBulkMode = ref(false)
const activeType = ref('expense')

const total = ref(0)
const hasMore = ref(true)
const limit = 20
const offset = ref(0)

const userId = localStorage.getItem('userId')

const filteredCategories = computed(() => {
  return categories.value.filter(c => c.type === activeType.value)
})

let searchTimeout = null

async function loadCategories(reset = false) {
  if (reset) {
    offset.value = 0
    categories.value = []
    hasMore.value = true
    selectedItems.value = []
  }
  
  if (offset.value === 0) {
    isLoading.value = true
  } else {
    isLoadingMore.value = true
  }
  
  try {
    const result = await getCategories(userId, searchQuery.value, limit, offset.value)
    if (reset) {
      categories.value = result.categories || []
    } else {
      categories.value = [...categories.value, ...(result.categories || [])]
    }
    total.value = result.total || 0
    hasMore.value = result.hasMore || false
  } catch (e) {
    console.error('Error:', e)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return
  offset.value += limit
  await loadCategories()
}

function handleSearch(query) {
  searchQuery.value = query
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadCategories(true)
  }, 500)
}

function handleTypeChange(type) {
  activeType.value = type
}

async function saveCategory(formData) {
  if (isSaving.value) return
  isSaving.value = true

  try {
    await createCategory(userId, formData.name, formData.type, formData.color)
    
    categories.value.unshift({
      id: Date.now(),
      name: formData.name,
      type: formData.type,
      color: formData.color
    })
    
    total.value++
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
    alert(e.message || 'Failed to save category')
    return
  } finally {
    isSaving.value = false
  }
  
  showAddForm.value = false
}

function confirmDelete(id) {
  deleteItemId.value = id
  showDeleteModal.value = true
}

async function deleteItem() {
  if (!deleteItemId.value) return
  
  try {
    await deleteCategory(userId, deleteItemId.value)
    categories.value = categories.value.filter(c => c.id !== deleteItemId.value)
    total.value--
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
  }
  
  deleteItemId.value = null
  showDeleteModal.value = false
}

function toggleSelectItem(id) {
  const index = selectedItems.value.indexOf(id)
  if (index === -1) {
    selectedItems.value.push(id)
  } else {
    selectedItems.value.splice(index, 1)
  }
}

function toggleBulkMode() {
  isBulkMode.value = !isBulkMode.value
  selectedItems.value = []
}

async function deleteSelected() {
  if (selectedItems.value.length === 0) return
  
  try {
    for (const id of selectedItems.value) {
      await deleteCategory(userId, id)
    }
    categories.value = categories.value.filter(c => !selectedItems.value.includes(c.id))
    total.value -= selectedItems.value.length
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
  }
  
  selectedItems.value = []
  isBulkMode.value = false
}

function handleScroll() {
  const scrollHeight = document.documentElement.scrollHeight
  const scrollTop = document.documentElement.scrollTop
  const clientHeight = document.documentElement.clientHeight
  
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadMore()
  }
}

onMounted(() => {
  loadCategories()
  window.addEventListener('scroll', handleScroll)
})

watch(() => props.refreshTrigger, () => {
  loadCategories(true)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<template>
  <div class="pb-24">
    <FilterBar 
      title="Categories"
      :show-date-filter="false"
      @search="handleSearch"
      @toggle-add-form="showAddForm = !showAddForm"
      @toggle-bulk-mode="toggleBulkMode"
    />

    <main class="max-w-sm mx-auto px-4 py-4 space-y-4">
      <!-- Type Tabs -->
      <div class="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
        <button 
          @click="handleTypeChange('expense')"
          class="h-10 rounded-xl text-sm font-medium transition-colors"
          :class="activeType === 'expense' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
        >
          Expense
        </button>
        <button 
          @click="handleTypeChange('income')"
          class="h-10 rounded-xl text-sm font-medium transition-colors"
          :class="activeType === 'income' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
        >
          Income
        </button>
      </div>

      <!-- Bulk Actions Bar -->
      <BulkActionsBar 
        :show="isBulkMode" 
        :count="selectedItems.length"
        @delete="deleteSelected"
      />

      <!-- Add/Edit Form -->
      <CategoryForm 
        :show="showAddForm"
        :is-submitting="isSaving"
        @save="saveCategory"
        @cancel="showAddForm = false"
      />

      <!-- Loading -->
      <ListSkeleton v-if="isLoading" :show-month-header="false" />

      <!-- Empty -->
      <div v-else-if="filteredCategories.length === 0" class="rounded-[1.5rem] border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center text-zinc-500">
        {{ searchQuery ? 'No categories found' : 'No categories yet. Add one above!' }}
      </div>

      <!-- Categories List -->
      <div v-else class="space-y-3">
        <div 
          v-for="cat in filteredCategories" 
          :key="cat.id"
          class="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-between"
        >
          <div v-if="isBulkMode" class="mr-2">
            <input 
              type="checkbox" 
              :checked="selectedItems.includes(cat.id)"
              @change="toggleSelectItem(cat.id)"
              class="w-4 h-4 rounded border-zinc-600 bg-zinc-800"
              :class="cat.type === 'income' ? 'text-emerald-500' : 'text-red-500'"
            />
          </div>
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div 
              class="w-6 h-6 rounded-lg flex-shrink-0"
              :style="{ backgroundColor: cat.color }"
            />
            <span class="text-zinc-100 truncate">{{ cat.name }}</span>
          </div>
          <button 
            v-if="!isBulkMode"
            @click="confirmDelete(cat.id)" 
            class="p-1 text-zinc-600 hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !isLoading" class="text-center py-2">
        <button 
          @click="loadMore"
          class="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          Load more...
        </button>
      </div>
      
      <!-- Loading More -->
      <ListSkeleton v-if="isLoadingMore" :rows="2" :show-month-header="false" />

      <!-- Total count -->
      <div class="text-center text-zinc-600 text-xs pt-1">
        {{ filteredCategories.length }} categories
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <DeleteModal 
      :show="showDeleteModal"
      title="Delete Category"
      message="Are you sure you want to delete this category? This action cannot be undone."
      @cancel="showDeleteModal = false"
      @confirm="deleteItem"
    />
  </div>
</template>
