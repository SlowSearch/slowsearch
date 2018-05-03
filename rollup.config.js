import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import eslint from 'rollup-plugin-eslint';

export default {
  input: 'src/index.js',
  plugins: [
    eslint(),
    resolve({
      browser: true,
    }),
    commonjs(),
  ],
  output: {
    file: 'lib/index.js',
    format: 'es',
  },
};
