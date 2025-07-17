# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm start` - Starts development server at http://localhost:3000
- `npm test` - Runs tests in interactive watch mode
- `npm run build` - Creates production build in `build/` folder
- `npm install` - Install dependencies after adding new packages

### Testing
- `npm test` - Interactive test runner
- `npm test -- --watchAll=false` - Run tests once without watch mode

## Architecture

This is a **TimeToSync** React application built with shadcn/ui components and Tailwind CSS:

- **Entry Point**: `src/index.js` - React application root with StrictMode
- **Main Component**: `src/App.js` - Contains ThemeProvider and Layout wrapper
- **Layout**: `src/components/layout.js` - Main layout with sidebar
- **Sidebar**: `src/components/sidebar.js` - Collapsible left navigation menu
- **Theme System**: `src/components/theme-provider.js` - Dark/light theme support
- **UI Components**: `src/components/ui/` - shadcn/ui components (button, etc.)
- **Utilities**: `src/lib/utils.js` - Utility functions for className merging

## Styling

- **Tailwind CSS**: Primary styling framework with custom CSS variables
- **shadcn/ui**: Component library with consistent design system
- **Theme Support**: Built-in dark/light mode with system preference detection
- **CSS Variables**: Defined in `src/index.css` for theme customization

## Key Features

- **Responsive Sidebar**: Collapsible navigation with icons and labels
- **Theme Toggle**: Switch between light/dark modes
- **Dashboard Layout**: Grid-based cards showing time tracking metrics
- **Modern UI**: Clean, professional interface using shadcn/ui components

## Dependencies

- React 19.1.0 with React DOM
- React Scripts 5.0.1 (Create React App toolchain)
- Tailwind CSS 3.3.0 with PostCSS and Autoprefixer
- shadcn/ui dependencies: class-variance-authority, clsx, tailwind-merge
- Lucide React for icons
- Testing Library suite for component testing

## Deployment

The app is configured for Netlify deployment:
- `netlify.toml` configures build command and SPA routing
- Build output goes to `build/` directory
- All routes redirect to `index.html` for client-side routing