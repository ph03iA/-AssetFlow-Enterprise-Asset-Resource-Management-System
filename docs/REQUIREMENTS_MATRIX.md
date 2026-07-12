# AssetFlow requirement matrix

This matrix is the release contract derived from the assignment. A row is complete only when its behavior is implemented, covered by an automated test where practical, and exercised in the final seeded demo.

## Authentication and authorization

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| AUTH-01 | Public signup creates an active Employee account and exposes no role selector. | Signup integration test confirms `EMPLOYEE`; attempted role injection is ignored or rejected. |
| AUTH-02 | Users can log in with email/password, log out, and retain a validated session. | Authentication tests plus a protected-route browser scenario. |
| AUTH-03 | Forgot-password flow issues a time-limited, single-use reset token. | Token expiry and single-use tests; browser reset scenario. |
| AUTH-04 | Only Admin can assign Admin, Asset Manager, or Department Head roles from the Employee Directory. | Authorization tests for allowed and denied promotions. |
| AUTH-05 | Inactive accounts and users lacking a required role are denied server-side. | Session and permission tests returning the correct redirect/forbidden result. |

## Dashboard

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| DASH-01 | Show Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, and Upcoming Returns. | Seeded KPI query tests and visible dashboard values. |
| DASH-02 | Separate overdue returns from upcoming returns. | Date-boundary test and dedicated overdue dashboard region. |
| DASH-03 | Provide permitted quick actions for Register Asset, Book Resource, and Raise Maintenance Request. | Role-based UI and direct-route authorization tests. |
| DASH-04 | Scope Employee and Department Head data appropriately while managers/admin see broader data. | Four-role dashboard fixture tests. |

## Organization setup

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| ORG-01 | Admin can create, edit, activate, and deactivate departments. | CRUD integration tests and Organization Setup browser flow. |
| ORG-02 | A department can have an optional parent and Department Head without creating hierarchy cycles. | Parent/head validation tests, including a cycle rejection. |
| ORG-03 | Admin can create and edit asset categories, including optional category-specific field definitions. | Category CRUD and custom-field schema tests. |
| ORG-04 | Employee Directory shows name, email, department, role, and status and supports admin changes. | Directory filtering/update browser scenario and authorization tests. |

## Asset directory and lifecycle

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| AST-01 | Asset Manager can register an asset with category, unique generated `AF-####` tag, serial number, dates/cost, condition, location, attachments, and bookable flag. | Registration integration test, uniqueness test, and browser scenario. |
| AST-02 | Search/filter supports tag, serial number, QR value, category, lifecycle status, department, and location. | Parameterized query tests and usable filter UI. |
| AST-03 | Supported states are Available, Allocated, Reserved, Under Maintenance, Lost, Retired, and Disposed. | Shared lifecycle transition unit tests. |
| AST-04 | Asset detail retains allocation, transfer, return, maintenance, and audit history. | Seeded detail integration test and visible timeline. |
| AST-05 | Invalid lifecycle transitions are rejected on the server. | Transition-table unit tests and mutation authorization checks. |

## Allocation, transfer, return, and overdue handling

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| ALC-01 | Allocate an available asset to an employee or department with optional Expected Return Date. | Successful allocation browser flow and database assertions. |
| ALC-02 | Double-allocation is blocked atomically, identifies the current holder, and offers a transfer request. | Conflict integration test and conflict UI. |
| ALC-03 | Transfer follows Requested to Approved/Rejected, with manager/head authorization and automatic history update. | Approval/rejection tests and two-role browser scenario. |
| ALC-04 | Return captures condition/check-in notes, requires approval, closes the allocation, and returns the asset to Available when valid. | Return workflow integration and browser tests. |
| ALC-05 | Past-due open allocations are automatically surfaced as overdue in dashboard and notifications. | Boundary-date query test and overdue alert evidence. |

## Shared-resource booking

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| BKG-01 | Users can view a resource calendar and create bookings for shared/bookable assets. | Calendar browser scenario and booking persistence test. |
| BKG-02 | Overlapping bookings for one resource are rejected; an adjacent booking beginning at the prior end time is accepted. | Explicit `09:00-10:00`, `09:30-10:30`, and `10:00-11:00` tests. |
| BKG-03 | Status derives or transitions through Upcoming, Ongoing, Completed, and Cancelled. | Time/status unit tests. |
| BKG-04 | Authorized users can cancel or reschedule without introducing an overlap. | Mutation integration tests and browser scenario. |
| BKG-05 | A reminder notification is produced before the slot starts. | Reminder job/service test with a fixed clock. |

## Maintenance

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| MNT-01 | Employee can raise a request for an asset with issue, priority, and optional photo. | Request integration test and browser form scenario. |
| MNT-02 | Workflow supports Pending, Approved/Rejected, Technician Assigned, In Progress, and Resolved. | State-machine unit tests and role-based action tests. |
| MNT-03 | Only Asset Manager can approve/reject; appropriate manager actions assign a technician and advance work. | Authorization test matrix. |
| MNT-04 | Approval moves asset to Under Maintenance; resolution returns it to Available unless another valid state applies. | Transaction integration tests. |
| MNT-05 | Maintenance history remains visible on the asset. | Asset-detail query test. |

## Audits

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| AUD-01 | Admin can create a dated audit cycle scoped by department and/or location and assign one or more auditors. | Creation validation and browser scenario. |
| AUD-02 | Assigned auditors mark each in-scope asset Verified, Missing, or Damaged with notes. | Assignment authorization and result persistence tests. |
| AUD-03 | Flagged items generate a discrepancy report automatically. | Report-generation integration test. |
| AUD-04 | Closing a cycle locks results and updates confirmed missing assets to Lost. | Transaction/immutability tests and closed-cycle UI evidence. |
| AUD-05 | Audit history is retained per cycle and asset. | History query tests. |

## Reports, notifications, and logs

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| RPT-01 | Reports show utilization trends, most-used/idle assets, maintenance frequency, due/retirement candidates, department allocations, and booking heatmap. | Seeded report query tests and visible labeled charts/tables. |
| RPT-02 | Managers can export actionable reports. | CSV download test with verified headers and rows. |
| NTF-01 | Users receive relevant assignment, maintenance, booking, transfer, overdue, and audit notifications. | Event-to-recipient integration tests. |
| NTF-02 | Users can view unread/read notifications and mark them read. | Notification mutation test and browser scenario. |
| LOG-01 | Mutating admin, manager, head, and employee actions record actor, action, target, and time. | Audit-log integration tests across core mutations. |
| LOG-02 | Activity log is filterable and visible only to authorized management roles. | Query and authorization tests. |

## Role expectations

| Role | Required capabilities |
| --- | --- |
| Admin | Organization setup, employee role assignment, audit-cycle management, organization-wide analytics and logs. |
| Asset Manager | Register/allocate assets; approve transfers, maintenance, discrepancy resolutions, and return condition notes. |
| Department Head | View department assets; approve in-department allocation/transfer requests; book for the department. |
| Employee | View assigned assets; book resources; raise maintenance requests; initiate returns and transfers. |

## Cross-cutting release criteria

- All mutations validate input on the server and enforce role/ownership rules.
- Referential conflicts and overlap rules execute transactionally.
- Forms provide labeled fields, inline validation, preserved input, and double-submit protection.
- Each list has loading, empty, error, and no-results behavior.
- Primary workflows are keyboard operable, responsive from 360 px upward, and respect reduced-motion preferences.
- Dates, times, currency, and large numbers use `Intl` formatting rather than hand-built strings.
- A fresh clone can install, migrate, seed, test, build, and run by following the README.
