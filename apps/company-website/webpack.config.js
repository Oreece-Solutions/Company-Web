const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/company-website'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'web',
      compiler: 'swc',
      main: './src/main.tsx',
      tsConfig: './tsconfig.app.json',
      assets: [],
      styles: ['./src/index.css'],
      outputHashing: 'all',
      optimization: true,
    }),
  ],
};
