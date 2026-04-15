import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface HistoryEntry {
  path: string;
  title: string;
  timestamp: number;
}

export const useNavigationStore = defineStore('navigation', () => {
  const historyLength = ref(window.history.length);
  const currentIndex = ref(0);
  const historyEntries = ref<HistoryEntry[]>([]);
  const maxHistorySize = 50;
  const isNavigating = ref(false);
  
  const canGoBack = computed(() => historyLength.value > 1);
  const canGoForward = computed(() => false);
  
  function addHistoryEntry(path: string, title: string = '') {
    const entry: HistoryEntry = {
      path,
      title,
      timestamp: Date.now(),
    };
    
    if (currentIndex.value < historyEntries.value.length - 1) {
      historyEntries.value = historyEntries.value.slice(0, currentIndex.value + 1);
    }
    
    historyEntries.value.push(entry);
    currentIndex.value = historyEntries.value.length - 1;
    
    if (historyEntries.value.length > maxHistorySize) {
      historyEntries.value.shift();
      currentIndex.value--;
    }
  }
  
  function updateHistoryLength() {
    historyLength.value = window.history.length;
  }
  
  function setNavigating(value: boolean) {
    isNavigating.value = value;
  }
  
  function getRecentHistory(count: number = 10): HistoryEntry[] {
    return historyEntries.value.slice(-count).reverse();
  }
  
  function clearHistory() {
    historyEntries.value = [];
    currentIndex.value = 0;
  }
  
  return {
    historyLength,
    currentIndex,
    historyEntries,
    isNavigating,
    canGoBack,
    canGoForward,
    addHistoryEntry,
    updateHistoryLength,
    setNavigating,
    getRecentHistory,
    clearHistory,
  };
});
