<script setup lang="ts">
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ToastStack from '@/components/ui/ToastStack.vue'
</script>

<template>
  <RouterView />
  <ToastStack />
  <ConfirmDialog />
</template>
