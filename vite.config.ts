
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 确保注入的是字符串，即使环境变量不存在也注入空字符串而非 undefined
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
