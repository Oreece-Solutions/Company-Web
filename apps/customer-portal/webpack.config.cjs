const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/customer-portal'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'web',
      compiler: 'swc',
      main: './src/main.tsx',
      index: './index.html',
      tsConfig: './tsconfig.app.json',
      assets: [],
      styles: ['./src/styles.css'],
      outputHashing: 'all',
      optimization: true,
    }),
  ],
};
