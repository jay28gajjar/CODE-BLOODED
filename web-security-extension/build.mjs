// Custom multi-phase build script for the Chrome extension
// Phase 1: content.js (IIFE, single file, all dependencies inlined)
// Phase 2: background.js (IIFE, single file, all dependencies inlined)
// Phase 3: HTML pages with React (popup, options, warning) using ES modules
// Phase 4: Copy manifest.json and public/ assets

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { cp, mkdir, copyFile, readdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseConfig = {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
};

async function buildScript(entry, name, outDir) {
  console.log(`\nBuilding ${name}...`);
  await build({
    ...baseConfig,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      minify: false,
      target: 'esnext',
      lib: {
        entry: resolve(__dirname, entry),
        formats: ['iife'],
        name: name.replace('.js', '').replace(/-/g, '_'),
        fileName: () => name,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          entryFileNames: name,
        },
      },
    },
  });
  console.log(`  ✓ ${name} built`);
}

async function buildPages(outDir) {
  console.log('\nBuilding HTML pages...');
  await build({
    ...baseConfig,
    plugins: [react()],
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      minify: false,
      target: 'esnext',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/popup.html'),
          options: resolve(__dirname, 'src/options/options.html'),
          warning: resolve(__dirname, 'src/warning/warning.html'),
        },
        output: {
          format: 'es',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  });
  console.log('  ✓ HTML pages built');
}

async function copyPublicAssets(outDir) {
  console.log('\nCopying public assets...');
  try {
    await cp(resolve(__dirname, 'public'), outDir, { recursive: true });
    console.log('  ✓ public/ assets copied');
  } catch (e) {
    console.warn('  ! No public/ directory found, skipping');
  }
  try {
    await copyFile(
      resolve(__dirname, 'manifest.json'),
      resolve(outDir, 'manifest.json')
    );
    console.log('  ✓ manifest.json copied');
  } catch (e) {
    console.error('  ✗ Failed to copy manifest.json:', e.message);
  }
}

async function main() {
  const outDir = resolve(__dirname, 'dist');
  await mkdir(outDir, { recursive: true });

  // Phase 1 & 2: Script bundles (IIFE, single-file)
  await buildScript('src/content/content-script.ts', 'content.js', outDir);
  await buildScript('src/background/service-worker.ts', 'background.js', outDir);

  // Phase 3: HTML pages (ES modules, code-split OK)
  await buildPages(outDir);

  // Phase 4: Static assets
  await copyPublicAssets(outDir);

  console.log('\n✅ Build complete! Extension ready in dist/\n');
}

main().catch((err) => {
  console.error('\n❌ Build failed:', err);
  process.exit(1);
});
