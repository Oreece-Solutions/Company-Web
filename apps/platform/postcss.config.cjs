// Nx runs this app's (inferred) build target with CWD = apps/platform, not
// the workspace root -- Tailwind resolves relative `content` globs against
// CWD regardless of where tailwind.config.ts itself lives, so the shared
// config's relative globs silently matched zero files here. Override with
// absolute paths instead of relying on CWD.
const path = require('path');
const sharedConfig = require(path.resolve(__dirname, '../../tailwind.config.ts'));
const config = sharedConfig.default || sharedConfig;

module.exports = {
  plugins: {
    tailwindcss: {
      ...config,
      content: [
        path.resolve(__dirname, './src/**/*.{ts,tsx}'),
        path.resolve(__dirname, '../../libs/shared/ui/src/**/*.{ts,tsx}'),
      ],
    },
    autoprefixer: {},
  },
};
