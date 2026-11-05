<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'

const ui = useUiStore()
const state = computed(() => ui.confirmState)
</script>

<template>
  <BaseModal :open="!!state" :title="state?.title ?? ''" size="sm" @close="ui.settleConfirm(false)">
    <p v-if="state?.message" class="text-sm text-slate-600 dark:text-slate-400">{{ state.message }}</p>
    <template #footer>
      <BaseButton variant="secondary" @click="ui.settleConfirm(false)">{{ $t('common.cancel') }}</BaseButton>
      <BaseButton :variant="state?.danger ? 'danger' : 'primary'" @click="ui.settleConfirm(true)">
        {{ state?.confirmLabel ?? $t('common.confirm') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
