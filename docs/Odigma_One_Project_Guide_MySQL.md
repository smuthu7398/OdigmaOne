# Odigma One - Client Task Manager (Updated)

## 1. Introduction

Odigma One is a web and mobile application to manage clients, tasks,
daily work updates, files, reports, and team collaboration.

The application provides a single platform for both your company and
clients to track work progress.

------------------------------------------------------------------------

# 2. Project Goal

Instead of using WhatsApp, Excel, or Email, users can:

-   Manage Clients
-   Create and Assign Tasks
-   Update Daily Work
-   Upload Screenshots & Files
-   Track Progress
-   Generate Reports
-   Receive Notifications

------------------------------------------------------------------------

# 3. Technology Stack

## Web Application

-   Next.js 15 (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Zustand
-   TanStack Query
-   React Hook Form + Zod
-   TanStack Table
-   Recharts
-   dnd-kit
-   Lucide React

## Mobile Application

-   React Native
-   Expo
-   Expo Router
-   TypeScript
-   Zustand
-   TanStack Query

## Backend

-   Next.js Route Handlers (REST API)
-   Prisma ORM

## Database

-   MySQL 8 Community Edition

### Why MySQL?

-   Free Community Edition
-   Easy to learn
-   Reliable
-   Works perfectly with Prisma
-   Suitable for small and large applications

## Authentication

-   Better Auth
-   Email & Password
-   Dynamic Roles & Permissions (RBAC)

### Why Better Auth?

-   First-class Expo / React Native support (same auth for Web & Mobile)
-   Works with Prisma and MySQL out of the box
-   Session management with tokens suitable for mobile apps
-   Built-in plugins (admin, organization) that help with RBAC

## File Storage

Development: - Local `uploads/` folder

Future: - Can migrate to cloud storage without changing business logic.

------------------------------------------------------------------------

# 4. Architecture

``` text
Next.js Web
      |
      | REST API
      v
Next.js Route Handlers
      |
   Prisma ORM
      |
 MySQL Database
      |
 Local uploads/

      ^
      |
React Native (Expo)
```

Both Web and Mobile use the same REST APIs.

------------------------------------------------------------------------

# 5. Main Modules

1.  Dashboard (role-based: team view & client view)
2.  User & Team Management
3.  Role & Permission Management
4.  Client Management
5.  Project Management
6.  Task Management (task types: Task / Bug — includes Bug Tracker)
    -   Views: List, Kanban Board, Calendar
7.  Daily Work Log (includes Timesheet reports)
8.  File Manager (includes Screenshot Gallery view)
9.  Comments
10. Activity Log (includes Timeline view)
11. Reports & Analytics
12. Notifications
13. Client Feedback
14. Documentation
15. Settings

> Search & Filters is a cross-cutting feature available in all modules,
> not a separate module.

### Consolidation Notes

Several earlier modules are merged to reduce code without losing
features:

-   **Bug Tracker** → a Task with `type = Bug` (same fields, board,
    comments)
-   **Timesheet** → a report generated from Daily Work Logs
-   **Screenshot Gallery** → File Manager filtered to images
-   **Timeline** → a view of the Activity Log
-   **Client Dashboard** → the Dashboard rendered with Client role
    permissions

------------------------------------------------------------------------

# 6. Task Fields

-   Task ID
-   Type (Task / Bug)
-   Client (Required)
-   Project (Optional)
-   Title
-   Description
-   Category
-   Priority
-   Status
-   Assigned By
-   Assigned To
-   Estimated Hours
-   Actual Hours
-   Progress
-   Due Date
-   Attachments
-   Comments

------------------------------------------------------------------------

# 7. Roles

Default Roles: - Super Admin - Admin - Manager - Team Lead - Developer -
QA - Client

Roles and permissions are fully configurable.

------------------------------------------------------------------------

# 8. API Examples

``` http
GET    /api/clients
POST   /api/clients

GET    /api/projects
POST   /api/projects

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

The Web and Mobile applications use the same APIs.

------------------------------------------------------------------------

# 9. Folder Structure

``` text
odigma-one/
├── web/
├── mobile/
├── shared/
├── prisma/
└── docs/
```

------------------------------------------------------------------------

# 10. Development Phases

## Phase 0 — Foundation (~1 week)

-   Monorepo setup with pnpm workspaces (`web/`, `mobile/`, `shared/`)
-   Complete Prisma schema for all core entities (User, Role,
    Permission, Client, Project, Task, Comment, Attachment, WorkLog,
    Activity, Notification)
-   Shared Zod schemas in `shared/` (one source of truth for API
    validation and TypeScript types on Web & Mobile)
-   Better Auth setup skeleton
-   Seed script for default roles & permissions
-   API conventions: `/api/v1` prefix, response format, error shape,
    pagination

## Phase 1 — Core (usable by the team)

-   Authentication
-   Roles & Permissions
-   Clients
-   Projects
-   Tasks (incl. Bug type)
-   Comments
-   File Uploads
-   Dashboard

## Phase 2

-   Daily Work Logs (incl. Timesheet report)
-   Notifications (in-app first)
-   Reports
-   Activity Log
-   Client Feedback

## Phase 3

-   Kanban view
-   Calendar view
-   Analytics
-   Documentation module

------------------------------------------------------------------------

# 11. Development Tools

-   Node.js (LTS)
-   MySQL Community Server
-   MySQL Workbench (Optional)
-   Visual Studio Code
-   Git
-   GitHub
-   pnpm

No Docker in the initial version.

------------------------------------------------------------------------

# 12. Summary

Odigma One is built with:

-   Next.js (Web)
-   React Native + Expo (Mobile)
-   Next.js REST APIs
-   Prisma ORM
-   MySQL 8 Community Edition
-   Better Auth
-   Local File Storage
-   Shared APIs for Web & Mobile
-   Dynamic Roles & Permissions
