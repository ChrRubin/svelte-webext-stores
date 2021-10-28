import typescript from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';
import cleaner from 'rollup-plugin-cleaner';
import pkg from './package.json';
import del from 'rollup-plugin-delete';

const config = [
  {
    input: './src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs'
      }
    ],
    plugins: [
      cleaner({
        targets: ['./dist']
      }),
      typescript()
    ],
    external: [
      'svelte/store'
    ]
  },
  {
    input: './dist/index.d.ts',
    output: {
      file: pkg.types,
      format: 'es'
    },
    plugins: [
      dts(),
      del({
        targets: ['./dist/*.d.ts', '!./dist/index.d.ts', './dist/__tests__'],
        hook: 'buildEnd'
      })
    ]
  }
];

export default config;
