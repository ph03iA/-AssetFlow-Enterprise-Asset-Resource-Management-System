# AssetFlow implementation plan

This roadmap turns the assignment into small, reviewable changes. Every numbered delivery step is intended to land as its own commit, with linting, type checks, and relevant tests run before it is pushed.

## Delivery principles

- Build vertical workflows, not disconnected mock screens.
- Enforce permissions and validation on the server, even when the UI hides an action.
- Keep signup limited to the Employee role; only an Admin can promote users.
- Record meaningful mutations in the activity log and notify affected users.
- Keep lifecycle and overlap rules in shared domain services with automated tests.
- Provide realistic seeded accounts and data so every workflow can be demonstrated locally.
- Use SQLite for a zero-service local setup while keeping persistence behind Prisma so the database can be replaced later.

## Commit sequence

### Foundation

1. Document the implementation roadmap.
2. Add the assignment requirement and acceptance-test matrix.
3. Add database, validation, authentication, icon, chart, and test dependencies.
4. Configure Prisma and define organization, user, session, and role models.
5. Add asset, allocation, transfer, booking, and maintenance models.
6. Add audit, notification, activity-log, and attachment models.
7. Create the initial SQLite migration and reusable database client.
8. Add a realistic, repeatable development seed dataset.

### Identity and shared application layer

9. Add password hashing, secure session cookies, and authorization helpers.
10. Implement employee-only signup, login, logout, and password-reset flows.
11. Add route protection and role-aware server authorization.
12. Establish AssetFlow design tokens and shared form/data-display primitives.
13. Build the responsive application shell, navigation, command search, and account menu.

### Core ERP modules

14. Implement the role-aware KPI dashboard and operational alerts.
15. Implement department management and hierarchy.
16. Implement asset-category management and custom field definitions.
17. Implement the employee directory, status changes, and admin-only promotions.
18. Implement asset registration, generated tags, filtering, and detail history.
19. Implement allocation conflict validation and allocation creation.
20. Implement transfer requests and manager/head approval.
21. Implement return approval, check-in condition notes, and overdue flags.
22. Implement shared-resource calendar booking and overlap validation.
23. Implement maintenance requests, approvals, technician assignment, and resolution.
24. Implement audit-cycle creation, auditor assignments, verification, discrepancy reporting, and closure.
25. Implement reports, utilization charts, maintenance insights, heatmaps, and CSV export.
26. Implement the notification center and filterable activity log.
27. Implement local attachment upload and secure file access for asset and maintenance evidence.

### Quality and completion

28. Add loading, empty, error, not-found, and permission-denied states.
29. Harden responsive layouts, keyboard access, focus behavior, overflow, and reduced motion.
30. Add unit tests for lifecycle, allocation, booking, maintenance, audit, and authorization rules.
31. Add end-to-end tests for Admin, Asset Manager, Department Head, and Employee journeys.
32. Complete the requirement audit, demo guide, environment documentation, and release verification.

## Verification gates

Every feature commit must pass the checks relevant to its scope. Before release, all of the following must pass:

```bash
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

The final audit must also demonstrate each acceptance scenario in `docs/REQUIREMENTS_MATRIX.md` against a fresh seeded database.
