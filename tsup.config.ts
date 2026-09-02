import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs'],
    platform: 'node',
    target: 'node20',
    outDir: '.',
    clean: false,
    sourcemap: true,
    noExternal: [/.*/],
});
