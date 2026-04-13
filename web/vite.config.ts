import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    vue(),
    // 自动导入 API
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/types/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
      },
    }),
    // 自动导入组件
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@api': resolve(__dirname, 'src/api'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@types': resolve(__dirname, 'src/types'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@element-plus/icons-vue')) {
              return 'ep-icons';
            }
            if (id.includes('element-plus/es/components')) {
              // Split large element-plus into sub-chunks by component group
              if (id.includes('/table') || id.includes('/virtual-list')) {
                return 'ep-table';
              }
              if (id.includes('/upload') || id.includes('/image')) {
                return 'ep-upload';
              }
              if (id.includes('/form') || id.includes('/input') || id.includes('/select') || id.includes('/checkbox') || id.includes('/radio') || id.includes('/switch') || id.includes('/slider') || id.includes('/time') || id.includes('/date') || id.includes('/cascader') || id.includes('/transfer') || id.includes('/rate') || id.includes('/color') || id.includes('/tree-select')) {
                return 'ep-form';
              }
              return 'ep-core';
            }
            if (id.includes('element-plus')) {
              return 'ep-core';
            }
            if (id.includes('lodash-es')) {
              return 'lodash';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
});