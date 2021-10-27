import typescript from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';
import cleaner from 'rollup-plugin-cleaner';
import pkg from './package.json';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser';

const config = [
  {
    input: './src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs'
      },
      {
        file: './dist/index.min.js',
        format: 'cjs',
        plugins: [terser()]
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
        targets: ['./dist/*.d.ts', '!./dist/index.d.ts'],
        hook: 'buildEnd'
      })
    ]
  }
];

export default config;
