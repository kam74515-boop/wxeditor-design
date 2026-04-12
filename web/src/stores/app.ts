import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isNetworkError = ref(false);
  const showUpgradeModal = ref(false);
  
  const setNetworkError = (status: boolean) => {
    isNetworkError.value = status;
  };

  const setShowUpgradeModal = (status: boolean) => {
    showUpgradeModal.value = status;
  };

  return {
    isNetworkError,
    setNetworkError,
    showUpgradeModal,
    setShowUpgradeModal,
  };
});
