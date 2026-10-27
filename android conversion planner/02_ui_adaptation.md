# Phase 2: UI & UX Adaptation

## Objective
The current UI is designed for a desktop layout with a sidebar and wide views. Mobile screens require a responsive, touch-friendly interface. Fortunately, TailwindCSS makes this straightforward.

## Tasks
- [ ] **Mobile Navigation**: Convert the desktop sidebar into a mobile bottom tab bar or a hamburger menu using Tailwind breakpoints (`md:hidden`).
- [ ] **Touch Interactions**: Replace mouse-specific interactions (like hover states for deleting items or small drag handles) with touch-friendly tap targets (minimum 44x44px).
- [ ] **Viewport Meta Tag**: Ensure `index.html` has a proper mobile viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`).
- [ ] **Responsive Grid**: Update tool grids (e.g., in `Dashboard.tsx`) to use `grid-cols-1` or `grid-cols-2` on mobile instead of 3 or 4 columns.
- [ ] **Safe Area Insets**: Add CSS padding for iOS/Android safe areas (notches and status bars) using `env(safe-area-inset-top)` in `main.css`.
