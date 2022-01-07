import typescript from 'rollup-plugin-typescript2'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

const baseOptions = () => {
  /**
   * @type { import('rollup').RollupOptions }
   */
  const options = {
    plugins: [
      commonjs(),
      typescript({ check: false }),
      json(),
      nodeResolve({ preferBuiltins: true })
    ],
    external: [
      'electron',
      // TODO
      // formidable causes this error when preloading, I have no idea but to make it external
      'formidable'
    ],
    treeshake: {
      moduleSideEffects: 'no-external',
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    }
  }
  return options
}
/**
 * @type { import('rollup').RollupOptions }
 */
const main = {
  ...baseOptions(),
  input: 'src/main.ts',
  output: { format: 'cjs', file: 'dist/main.js' }
}

/**
 * @type { import('rollup').RollupOptions }
 */
const preload = {
  ...baseOptions(),
  input: 'src/preload.ts',
  output: { format: 'cjs', file: 'dist/preload.js' }
}
export default [main, preload]
