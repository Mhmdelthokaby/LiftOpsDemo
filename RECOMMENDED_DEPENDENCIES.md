# Recommended Dependencies

Based on the project requirements for a robust/scalable frontend, here are the recommended dependencies to install:

## State Management
- **Zustand**: Lightweight, fast, and scalable barebones state-management solution.
- **Roax**: (Alternatively) Redux Toolkit if complex state logic or strict architectural patterns are preferred.

## Form Handling & Validation
- **React Hook Form**: Performant, flexible and extensible forms with easy-to-use validation.
- **Zod**: TypeScript-first schema declaration and validation library (works great with React Hook Form).

## HTTP Client
- **Axios** or **Ky**: Promise based HTTP client for the browser. Ky is a smaller, modern alternative.
- **TanStack Query (React Query)**: Powerful asynchronous state management for server state/data fetching.

## UI Components / Styling
- **Radix UI**: Unstyled, accessible components for building high-quality design systems and web apps.
- **Lucide React**: Beautiful & consistent icon toolkit.
- **Clsx** & **Tailwind-merge**: Utilities for constructing className strings conditionally and merging Tailwind classes.

## Dates
- **date-fns**: Modern JavaScript date utility library.

## Utility
- **Lodash** (or specific sub-packages): General utility functions (use sparingly, prefer native JS where possible).
