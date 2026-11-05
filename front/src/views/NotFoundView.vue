<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
</script>

<template>
  <div class="card mx-auto mt-10 max-w-lg">
    <EmptyState icon="search" :title="$t('notFound.title')" :text="$t('notFound.text')">
      <BaseButton to="/dashboard" icon="dashboard">{{ $t('notFound.home') }}</BaseButton>
    </EmptyState>
  </div>
</template>
