import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('axios') || id.includes('socket.io-client')) {
              return 'vendor-network';
            }
            return 'vendor-misc';
          }
          if (id.includes('FraudPrevention') || id.includes('FraudForensic')) {
            return 'feature-fraud-engine';
          }
          if (id.includes('EInvoiceViewer') || id.includes('TaxCompliance')) {
            return 'feature-tax-compliance';
          }
          if (id.includes('Escrow') || id.includes('Dispute')) {
            return 'feature-escrow-engine';
          }
          if (id.includes('LiveStream') || id.includes('VideoShopping')) {
            return 'feature-video-shopping';
          }
          if (id.includes('RecommendationsShelf') || id.includes('CurrencySwitcherModal') || id.includes('InternationalShippingModal')) {
            return 'feature-crossborder-recs';
          }
        },
      },
    },
  },
});
