# AssetFlow

AssetFlow is an enterprise asset and resource management system for tracking physical assets, allocating them to teams, booking shared resources, coordinating maintenance, and running audits from one place.

## Project status

The repository currently contains the initial application foundation. Product modules and business workflows will be implemented in subsequent changes.

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- ESLint and strict TypeScript checks
- pnpm for deterministic dependency management

## Local development

Requirements: Node.js 20.9 or newer and pnpm 10 or newer.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
pnpm check
pnpm build
```

## Planned modules

1. Authentication and role-based access
2. Operational dashboard
3. Organization setup and employee directory
4. Asset registration and lifecycle tracking
5. Allocation, transfer, and return workflows
6. Shared resource booking
7. Maintenance approvals and work tracking
8. Asset audit cycles and discrepancy reports
9. Reports and analytics
10. Notifications and activity logs

## Architecture direction

The application will use feature-oriented modules inside `src`, server-first rendering, explicit authorization at every server boundary, and shared domain rules for lifecycle transitions and booking/allocation conflicts. Infrastructure choices such as the database and authentication provider will be added with the first functional vertical slice.
