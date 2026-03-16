<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import BulkActionsBar from '../components/BulkActionsBar.vue'
import DeleteModal from '../components/DeleteModal.vue'
import FilterBar from '../components/FilterBar.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import TransactionForm from '../components/TransactionForm.vue'
import TransactionList from '../components/TransactionList.vue'
import { addExpense, deleteExpense, getCategories, getExpenses } from '../lib/db'

const props = defineProps({
  refreshTrigger: Number
})

const emit = defineEmits(['refresh'])

const expenses = ref([])
const categories = ref([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
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

let searchTimeout = null

async function loadData(reset = false) {
  if (reset) {
    offset.value = 0
    expenses.value = []
    hasMore.value = true
    selectedItems.value = []
  }

  if (offset.value === 0) {
    isLoading.value = true
  } else {
    isLoadingMore.value = true
  }

  try {
    const requests = [
      getExpenses(
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

    const [expResult, catResult] = await Promise.all(requests)

    if (reset) {
      expenses.value = expResult.expenses || []
    } else {
      expenses.value = [...expenses.value, ...(expResult.expenses || [])]
    }

    total.value = expResult.total || 0
    hasMore.value = expResult.hasMore || false

    if (catResult) {
      categories.value = (catResult.categories || []).filter(c => c.type === 'expense')
    }
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

async function saveExpense(formData) {
  try {
    await addExpense(userId, formData.categoryId, formData.description, formData.amount, formData.date)
    
    const category = categories.value.find(c => c.id == formData.categoryId)
    expenses.value.unshift({
      id: Date.now(),
      description: formData.description,
      amount: Number(formData.amount),
      category_id: formData.categoryId,
      category_name: category?.name || 'Other',
      category_color: category?.color || '#6b7280',
      date: formData.date
    })
    
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
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
    await deleteExpense(userId, deleteItemId.value)
    expenses.value = expenses.value.filter(e => e.id !== deleteItemId.value)
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
      await deleteExpense(userId, id)
    }
    expenses.value = expenses.value.filter(e => !selectedItems.value.includes(e.id))
    emit('refresh')
  } catch (e) {
    console.error('Error:', e)
  }
  
  selectedItems.value = []
  isBulkMode.value = false
}

onMounted(loadData)
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
      title="Expenses"
      add-button-color="bg-zinc-100"
      add-button-text-color="text-zinc-900"
      :show-category-filter="true"
      :categories="categories"
      :is-bulk-mode="isBulkMode"
      @search="handleSearch"
      @toggle-add-form="showAddForm = !showAddForm"
      @toggle-bulk-mode="toggleBulkMode"
    />

    <main class="max-w-sm mx-auto py-4 space-y-4">
      <!-- Bulk Actions Bar -->
      <BulkActionsBar 
        :show="isBulkMode" 
        :count="selectedItems.length"
        @delete="deleteSelected"
      />

      <!-- Add Form -->
      <TransactionForm 
        :show="showAddForm"
        type="expense"
        :categories="categories"
        button-color="bg-zinc-100"
        button-text-color="text-zinc-900"
        @save="saveExpense"
        @cancel="showAddForm = false"
      />

      <!-- Loading -->
      <ListSkeleton v-if="isLoading" />

      <!-- Empty -->
      <div v-else-if="expenses.length === 0" class="text-center py-8 text-zinc-500">
        No expenses found
      </div>

      <!-- List -->
      <TransactionList 
        v-else
        :items="expenses"
        type="expense"
        :is-bulk-mode="isBulkMode"
        :selected-items="selectedItems"
        amount-color="text-zinc-100"
        @toggle-select="toggleSelectItem"
        @confirm-delete="confirmDelete"
      />

      <div v-if="hasMore && !isLoading" class="text-center py-4">
        <button
          @click="loadMore"
          class="text-zinc-500 text-sm hover:text-zinc-300"
        >
          Load more...
        </button>
      </div>

      <ListSkeleton v-if="isLoadingMore" :rows="2" :show-month-header="false" />

      <div class="text-center text-zinc-600 text-xs pt-2">
        {{ expenses.length }} of {{ total }} expenses
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <DeleteModal 
      :show="showDeleteModal"
      title="Delete Expense"
      message="Are you sure you want to delete this expense? This action cannot be undone."
      @cancel="showDeleteModal = false"
      @confirm="deleteItem"
    />
  </div>
</template>
