# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run Jest tests
- `npm run test:watch` - Run Jest tests in watch mode

## Architecture

This is a minimal Vite-based frontend project for experimenting with notes apps and ideas. The structure is:

- **Entry point**: `index.html` loads the app into `#app` div and imports `src/main.js`
- **JavaScript**: `src/main.js` is the main entry point (currently just logs "hello world")
- **Styling**: Uses a comprehensive CSS custom property system in `src/css/style.css` with:
  - Fluid typography scale using `clamp()` functions
  - CSS custom properties for fonts (Open Sans primary, EB Garamond, JetBrains Mono)
  - OKLCH color system with light/dark variables
  - Organized sections: Global Reset, Block, Composition & Layouts, Utilities, Exception
- **Reset**: `src/css/reset.css` for CSS normalization
- **Build tool**: Vite for development and bundling

The project uses modern web standards (ES modules, CSS custom properties) and is set up for rapid prototyping of web-based note-taking applications.

## Test-First Development with Claude

1. **Write tests first** - Ask Claude to create tests for your expected functionality. Specify you're doing test-driven development so it won't create placeholder implementations.

2. **Verify tests fail** - Have Claude run the tests to confirm they fail as expected. Tell it not to write any implementation code yet.

3. **Commit tests** - Once satisfied with the test coverage, ask Claude to commit just the tests.

4. **Implement to pass tests** - Ask Claude to write code that makes the tests pass, without modifying the tests. Let it iterate until all tests pass.

5. **Commit working code** - Once tests pass, commit the implementation.

This approach ensures your code does exactly what's needed, nothing more, with built-in verification at each step.

## Better Comments VS Code Extension

Color-code your comments for better organization:

- **Alert comments** (`! Important note`) - Red highlighting for critical information
- **Query comments** (`? Why does this work?`) - Blue for questions and unclear code
- **TODO comments** (`TODO: Fix this later`) - Orange for tasks and reminders
- **Highlight comments** (`* Key point here`) - Green for important notes
- **Strikethrough** (`// Old code`) - Gray strikethrough for commented-out code


# Code style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Use modern CSS but only for the layout not for design

## CUBE CSS Rules

When writing CSS, follow the CUBE CSS methodology (Composition, Utility, Block, Exception):

**Composition Layer Rules:**
- Provide high-level flexible layouts only
- Determine element interactions and create consistent flow
- DON'T provide visual treatments (colors, fonts) or decorative styles
- DON'T force pixel-perfect layouts

**Utility Rules:**
- Apply single CSS properties or concise groups of related properties
- Create reusable helpers that extend design tokens
- DON'T define large groups of unrelated properties
- DON'T use as specificity hacks with !important

**Block Rules:**
- Extend work from global CSS, composition, and utility layers
- Stay concise (max 80-100 lines of CSS)
- Solve only one contextual problem per block
- DON'T grow beyond a handful of rules
- DON'T mix multiple unrelated components in one block

**Exception Rules:**
- Use data attributes, not CSS classes
- Provide concise variations to blocks only
- Handle state changes in exceptional circumstances
- DON'T variate blocks beyond recognition (create new blocks instead)

**Overarching Rule:** Consistency is key - how you achieve it depends on your team's approach.

## CSS Intrinsic Design Methodology

Follow CSS Intrinsic Design principles for modern, adaptive layouts:

**Core Principles:**
- **Contracting & Expanding**: Designs adapt fluidly to changes in available space
- **Flexibility**: Use CSS Grid, Flexbox, and modern CSS functions for layouts that adapt at various rates
- **Content-Driven**: Layouts respond to actual content rather than predetermined screen sizes
- **Intrinsic Sizing**: Elements size themselves based on their content and context

**Key Technologies to Use:**
- **CSS Math Functions**: Use `clamp()`, `min()`, `max()` for fluid sizing constraints
- **Container Queries**: Make components adapt based on their parent container's size, not just viewport
- **CSS Grid & 
- 
- Flexbox**: Leverage these layout methods for natural, flexible arrangements
- **Modern Units**: Prefer `ch`, `ex`, viewport units, and container-relative units over fixed pixels
- **`contain-intrinsic-size`**: Use for layout performance optimization

**Approach:**
- Move away from breakpoint-heavy responsive design
- Create designs that flow and change continuously with width changes
- Prioritize natural, adaptive user experiences over rigid layouts


## Dependencies

- `@js-temporal/polyfill`: Modern date/time API