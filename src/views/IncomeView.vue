<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import BulkActionsBar from '../components/BulkActionsBar.vue'
import DeleteModal from '../components/DeleteModal.vue'
import FilterBar from '../components/FilterBar.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import TransactionForm from '../components/TransactionForm.vue'
import TransactionList from '../components/TransactionList.vue'
import { addIncome, deleteIncome, getCategories, getIncomes } from '../lib/db'

const props = defineProps({
  refreshTrigger: Number
})

const emit = defineEmits(['refresh'])

const incomes = ref([])
const categories = ref([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isSaving = ref(false)
const showAddForm = ref(false)
const showDeleteModal = ref(false)
const deleteItemId = ref(null)
const selectedItems = ref([])
const isBulkMode = ref(false)
const total = ref(0)
const hasMore = ref(true)
const limit = 20
const offset = ref(0)

const filters = ref({
  startDate: '',
  endDate: '',
  search: '',
  categoryId: ''
})

const userId = localStorage.getItem('userId')
const CACHE_KEY = userId ? `income-view:${userId}` : 'income-view'

let searchTimeout = null

function persistCache() {
  if (!userId) return

  sessionStorage.setItem(CACHE_KEY, JSON.stringify({
    incomes: incomes.value,
    categories: categories.value,
    filters: filters.value,
    total: total.value,
    hasMore: hasMore.value,
    offset: offset.value,
    isBulkMode: isBulkMode.value,
    selectedItems: selectedItems.value,
  }))
}

function hydrateCache() {
  if (!userId) return false

  const raw = sessionStorage.getItem(CACHE_KEY)
  if (!raw) return false

  try {
    const cached = JSON.parse(raw)
    incomes.value = Array.isArray(cached.incomes) ? cached.incomes : []
    categories.value = Array.isArray(cached.categories) ? cached.categories : []
    filters.value = { ...filters.value, ...(cached.filters || {}) }
    total.value = Number(cached.total || 0)
    hasMore.value = Boolean(cached.hasMore)
    offset.value = Number(cached.offset || 0)
    isBulkMode.value = Boolean(cached.isBulkMode)
    selectedItems.value = Array.isArray(cached.selectedItems) ? cached.selectedItems : []
    isLoading.value = false
    return true
  } catch (error) {
    sessionStorage.removeItem(CACHE_KEY)
    return false
  }
}

async function loadData(reset = false) {
  const hasCachedData = incomes.value.length > 0 || categories.value.length > 0

  if (reset) {
    offset.value = 0
    incomes.value = []
    hasMore.value = true
    selectedItems.value = []
  }
  
  if (offset.value === 0) {
    isLoading.value = reset || !hasCachedData
  } else {
    isLoadingMore.value = true
  }

  try {
    const requests = [
      getIncomes(
        userId,
        filters.value.startDate,
        filters.value.endDate,
        filters.value.search,
        limit,
        offset.value,
        filters.value.categoryId
      )
    ]

    if (reset || categories.value.length === 0) {
      requests.push(getCategories(userId, '', 100, 0))
    }

    const [incResult, catResult] = await Promise.all(requests)

    if (reset) {
      incomes.value = incResult.incomes || []
    } else {
      incomes.value = [...incomes.value, ...(incResult.incomes || [])]
    }

    total.value = incResult.total || 0
    hasMore.value = incResult.hasMore || false

    if (catResult) {
      categories.value = (catResult.categories || []).filter(c => c.type === 'income')
    }

    persistCache()
  } catch (e) {
    console.error('Error loading:', e)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return
  offset.value += limit
  await loadData()
}

function handleSearch(query, startDate = '', endDate = '', categoryId = '') {
  filters.value.search = query
  filters.value.startDate = startDate
  filters.value.endDate = endDate
  filters.value.categoryId = categoryId
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadData(true)
  }, 500)
}

async function saveIncome(formData) {
  if (isSaving.value) return
  isSaving.value = true

  try {
    const result = await addIncome(userId, formData.categoryId, formData.source, formData.amount, formData.date)
    if (result.income) {
      incomes.value.unshift(result.income)
    }

    persistCache()
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
    alert(e.message || 'Failed to add income')
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
    await deleteIncome(userId, deleteItemId.value)
    incomes.value = incomes.value.filter(i => i.id !== deleteItemId.value)
    persistCache()
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
      await deleteIncome(userId, id)
    }
    incomes.value = incomes.value.filter(i => !selectedItems.value.includes(i.id))
    persistCache()
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
  }
  
  selectedItems.value = []
  isBulkMode.value = false
}

watch([filters, isBulkMode, selectedItems], persistCache, { deep: true })

onMounted(() => {
  hydrateCache()
  loadData()
})
watch(() => props.refreshTrigger, () => {
  loadData(true)
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<template>
  <div class="pb-24">
    <FilterBar 
      title="Income"
      add-button-color="bg-zinc-100"
      add-button-text-color="text-zinc-900"
      :show-category-filter="true"
      :categories="categories"
      :is-bulk-mode="isBulkMode"
      @search="handleSearch"
      @toggle-add-form="showAddForm = !showAddForm"
      @toggle-bulk-mode="toggleBulkMode"
    />

    <main class="max-w-sm mx-auto px-4 py-4 space-y-4">
      <!-- Bulk Actions Bar -->
      <BulkActionsBar 
        :show="isBulkMode" 
        :count="selectedItems.length"
        @delete="deleteSelected"
      />

      <!-- Add Form -->
      <TransactionForm 
        :show="showAddForm"
        :is-submitting="isSaving"
        type="income"
        :categories="categories"
        button-color="bg-zinc-100"
        button-text-color="text-zinc-900"
        @save="saveIncome"
        @cancel="showAddForm = false"
      />

      <!-- Loading -->
      <ListSkeleton v-if="isLoading" />

      <!-- Empty -->
      <div v-else-if="incomes.length === 0" class="rounded-[1.5rem] border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center text-zinc-500">
        No income found
      </div>

      <!-- List -->
      <TransactionList 
        v-else
        :items="incomes"
        type="income"
        :is-bulk-mode="isBulkMode"
        :selected-items="selectedItems"
        amount-prefix="+"
        amount-color="text-emerald-400"
        @toggle-select="toggleSelectItem"
        @confirm-delete="confirmDelete"
      />

      <div v-if="hasMore && !isLoading" class="text-center py-2">
        <button
          @click="loadMore"
          class="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          Load more...
        </button>
      </div>

      <ListSkeleton v-if="isLoadingMore" :rows="2" :show-month-header="false" />

      <div class="text-center text-zinc-600 text-xs pt-1">
        {{ incomes.length }} of {{ total }} income entries
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <DeleteModal 
      :show="showDeleteModal"
      title="Delete Income"
      message="Are you sure you want to delete this income? This action cannot be undone."
      @cancel="showDeleteModal = false"
      @confirm="deleteItem"
    />
  </div>
</template>
