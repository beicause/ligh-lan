import typescript from 'rollup-plugin-typescript2'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import pkg from './package.json'

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
      // TODO
      // formidable causes error, I have no idea but to make it external
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
const index = {
  ...baseOptions(),
  input: 'src/index.ts',
  output: { format: 'cjs', file: pkg.main }
}

const cli = {
  ...baseOptions(),
  input: 'src/cli.ts',
  output: { format: 'cjs', file: pkg.bin.lan }
}

export default [index, cli]
