<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { commentsApi } from '@/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { useUiStore } from '@/stores/ui'
import type { Comment } from '@/types/api'
import { formatDateTime, formatRelative } from '@/utils/format'

const props = defineProps<{ riskId: string; currentUserId: string; isAdmin: boolean }>()
const emit = defineEmits<{ changed: [count: number] }>()

const { t } = useI18n()
const notify = useNotify()
const ui = useUiStore()

const comments = ref<Comment[]>([])
const loading = ref(true)
const sending = ref(false)
const body = ref('')

async function load() {
  loading.value = true
  try {
    comments.value = await commentsApi.list(props.riskId)
  } catch (error) {
    notify.error(error)
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!body.value.trim()) return
  sending.value = true
  try {
    comments.value.push(await commentsApi.create(props.riskId, body.value.trim()))
    body.value = ''
    emit('changed', comments.value.length)
  } catch (error) {
    notify.error(error)
  } finally {
    sending.value = false
  }
}

async function remove(comment: Comment) {
  if (!(await ui.confirm({ title: t('comment.deleteConfirm'), danger: true, confirmLabel: t('common.delete') }))) return
  try {
    await commentsApi.remove(props.riskId, comment.id)
    comments.value = comments.value.filter((c) => c.id !== comment.id)
    emit('changed', comments.value.length)
  } catch (error) {
    notify.error(error)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void send()
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10 text-slate-400"><BaseSpinner /></div>
    <template v-else>
      <EmptyState v-if="!comments.length" icon="message" :title="t('comment.empty')" />
      <ul v-else class="space-y-4">
        <li v-for="comment in comments" :key="comment.id" class="group flex gap-3">
          <UserAvatar :name="comment.author.name" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-slate-900 dark:text-white">{{ comment.author.name }}</span>
              <time class="text-xs text-slate-400" :datetime="comment.createdAt" :title="formatDateTime(comment.createdAt)">
                {{ formatRelative(comment.createdAt) }}
              </time>
              <button
                v-if="comment.author.id === currentUserId || isAdmin"
                type="button"
                class="ml-auto rounded-md p-1 text-slate-400 transition hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                :aria-label="t('common.delete')"
                @click="remove(comment)"
              >
                <AppIcon name="trash" :size="15" />
              </button>
            </div>
            <p class="mt-1 rounded-xl rounded-tl-sm bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              {{ comment.body }}
            </p>
          </div>
        </li>
      </ul>

      <form class="mt-5 flex flex-col gap-2" @submit.prevent="send">
        <textarea
          v-model="body"
          rows="3"
          maxlength="1000"
          class="field resize-y"
          :placeholder="t('comment.placeholder')"
          :aria-label="t('comment.placeholder')"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 tabular-nums">{{ body.length }}/1000</span>
          <BaseButton type="submit" icon="message" :loading="sending" :disabled="!body.trim()">
            {{ t('comment.send') }}
          </BaseButton>
        </div>
      </form>
    </template>
  </div>
</template>
