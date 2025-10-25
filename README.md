# Company Web - Nx Monorepo

A modern React application built with Nx monorepo architecture, featuring a company website with responsive design and Supabase integration.

## 🏗️ Architecture

This project uses an **Nx monorepo** structure with the following organization:

```
company-web-monorepo/
├── apps/
│   └── company-website/          # Main React application
├── libs/
│   ├── shared/
│   │   ├── ui/                   # Shared UI components (shadcn/ui)
│   │   ├── utils/                # Utility functions and hooks
│   │   ├── types/                # Shared TypeScript types
│   │   └── data-access/          # Supabase client & API calls
│   └── company-website/
│       └── features/             # Feature-specific components
├── supabase/                     # Supabase configuration
└── nx.json                       # Nx workspace configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn package manager

### Installation
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Run linting
yarn lint
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn lint` | Run ESLint |
| `yarn nx graph` | Visualize project dependencies |
| `yarn nx serve company-website` | Serve the main app |
| `yarn nx build company-website` | Build the main app |

## 🏛️ Libraries

### Shared Libraries
- **`@company-web/shared/ui`** - All shadcn/ui components
- **`@company-web/shared/utils`** - Utility functions and custom hooks
- **`@company-web/shared/types`** - Shared TypeScript interfaces
- **`@company-web/shared/data-access`** - Supabase client and API calls

### Feature Libraries
- **`@company-web/features`** - Company website specific components

## 🛠️ Development

### Adding New Components
```bash
# Generate a new component in the features library
yarn nx g @nx/react:component my-component --project=company-website-features

# Generate a new component in the shared UI library
yarn nx g @nx/react:component my-ui-component --project=shared-ui
```

### Adding New Libraries
```bash
# Generate a new shared library
yarn nx g @nx/react:library my-lib --directory=libs/shared --importPath=@company-web/shared/my-lib
```

## 🔧 Configuration

### Path Aliases
The following path aliases are configured:
- `@company-web/shared/ui` → `libs/shared/ui/src`
- `@company-web/shared/utils` → `libs/shared/utils/src`
- `@company-web/shared/types` → `libs/shared/types/src`
- `@company-web/shared/data-access` → `libs/shared/data-access/src`
- `@company-web/features` → `libs/company-website/features/src`

### Build Configuration
- **Vite** for fast development and building
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **ESLint** for code quality

## 📱 Features

- ✅ **Responsive Design** - Mobile-first approach with TailwindCSS
- ✅ **Modern UI** - shadcn/ui component library
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Performance** - Optimized with Vite and Nx caching
- ✅ **Supabase Integration** - Backend services and edge functions
- ✅ **Monorepo Benefits** - Code sharing and scalability

## 🚀 Deployment

The application builds to `dist/apps/company-website/` and can be deployed to any static hosting service.

```bash
# Build for production
yarn build

# Preview production build
yarn preview
```

## 📊 Project Graph

Visualize the project dependencies:
```bash
yarn nx graph
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

This project is private and proprietary.