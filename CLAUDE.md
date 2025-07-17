# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm start` - Starts development server at http://localhost:3000
- `npm test` - Runs tests in interactive watch mode
- `npm run build` - Creates production build in `build/` folder

### Testing
- `npm test` - Interactive test runner
- `npm test -- --watchAll=false` - Run tests once without watch mode

## Architecture

This is a standard Create React App project with the following structure:

- **Entry Point**: `src/index.js` - React application root with StrictMode
- **Main Component**: `src/App.js` - Primary application component
- **Styling**: CSS files alongside components (`App.css`, `index.css`)
- **Testing**: Jest with React Testing Library setup
- **Build Output**: `build/` directory for production files

## Deployment

The app is configured for Netlify deployment:
- `netlify.toml` configures build command and SPA routing
- Build output goes to `build/` directory
- All routes redirect to `index.html` for client-side routing

## Dependencies

- React 19.1.0 with React DOM
- React Scripts 5.0.1 (Create React App toolchain)
- Testing Library suite for component testing
- Web Vitals for performance monitoring

The project uses standard Create React App configuration with no ejection or custom webpack setup.