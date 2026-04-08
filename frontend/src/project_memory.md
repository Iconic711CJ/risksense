# RiskSense Dashboard - Project Memory

## Overview
RiskSense (ERIMP) is an Enterprise Risk Intelligence & Mitigation Platform for NIPA Zambia. It provides a centralized dashboard for risk monitoring, department-level registers, and executive reporting.

## Tech Stack
### Frontend
- **Framework**: React 18 (Vite)
- **Routing**: React Router v7
- **State**: Zustand (Persisted Auth)
- **Styling**: TailwindCSS (Minimalist high-contrast theme)
- **Visuals**: Recharts, Custom Risk Matrix
- **PDF**: jsPDF

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth

## Design System (v2.0 Minimalist)
- **Primary Color**: Dark Green (`#064E3B`) — Used for branding, main actions, and stability.
- **Accent Color**: Orange (`#F97316`) — Used for highlights and important reports.
- **Background**: Solid White (`#FFFFFF`) with light gray (`#F8FAFC`) borders.
- **Typography**: `Outfit` for headings (bold, geometric) and `Inter` for body (high legibility).
- **Aesthetic**: Flat minimalism with subtle shadows and rounded corners (`12px-16px`).

## Core Architecture
### Authentication
- `AuthProvider`: Global listener for Supabase sessions. Ensures state synchronization.
- `useAppStore`: Manages `user`, `token`, and `loading` states.
- `api.js`: Axios interceptor for JWT injection.

### Key Workflows
- **Report Generation**: High-quality PDF generation with branding and heat maps.
- **Risk Reporting**: Multi-stage risk logging with auto-tagging.

## Recent Changes (April 2026)
- **Fixed Infinite Loading**: Added `/me` endpoint to backend and improved `AuthProvider` initialization.
- **UI Overhaul**: Migrated from dark glassmorphism to a clean, minimalist 3-color palette (White/Green/Orange).
