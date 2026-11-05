# Nimbus Web

Vue 3.5 + TypeScript + Pinia + Vue Router + vue-i18n + Tailwind CSS 4 + Chart.js. Sem biblioteca de componentes de UI: todos os componentes em `src/components` foram feitos à mão.

Veja o [README principal](../README.md) para a visão geral.

```bash
npm install
npm run dev        # http://localhost:5173 (faz proxy de /api para http://127.0.0.1:3005)
```

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checagem de tipos + build de produção (`dist/`) |
| `npm run build-only` | Build de produção sem checagem de tipos |
| `npm run type-check` | `vue-tsc` |
| `npm test` | Vitest (testes unitários e de componentes) |

Defina `VITE_API_TARGET` para apontar o proxy da API para outro endereço durante o desenvolvimento.
