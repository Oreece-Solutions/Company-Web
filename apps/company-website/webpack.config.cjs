const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/company-website'),
  },
  resolve: {
    alias: {
      '@company-web/shared/ui': join(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@company-web/shared/utils': join(__dirname, '../../libs/shared/utils/src/index.ts'),
      '@company-web/shared/types': join(__dirname, '../../libs/shared/types/src/index.ts'),
      '@company-web/shared/data-access': join(__dirname, '../../libs/shared/data-access/src/index.ts'),
      '@company-web/features': join(__dirname, '../../libs/company-website/features/src/index.ts'),
    },
  },
  devServer: {
    static: [
      {
        directory: join(__dirname, '../../public'),
        publicPath: '/',
      }
    ],
    historyApiFallback: true,
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'web',
      compiler: 'swc',
      main: './src/main.tsx',
      index: './index.html',
      tsConfig: './tsconfig.app.json',
      assets: [],
      styles: ['./src/index.css'],
      outputHashing: 'all',
      optimization: true,
      extractCss: true,
      generatePackageJson: false,
      postcssConfig: './postcss.config.cjs',
    }),
  ],
};
