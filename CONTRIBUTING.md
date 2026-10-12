# Contributing to TuitionGuard

Thanks for helping improve TuitionGuard. It is a financial-workflow prototype: changes must preserve deterministic policy enforcement, explicit human approval, and the boundary between simulations and real payment systems.

## Before you start

1. Read [README.md](./README.md) and [docs/SETUP.md](./docs/SETUP.md).
2. Check the current issues and pull requests for existing work on the same change.
3. For substantial changes, open an issue or discussion before investing in an implementation.

## Development workflow

1. Create a focused branch from the default branch.
2. Keep changes scoped and add or update regression tests for behavior changes.
3. Run the checks below from the project root.
4. Open a pull request describing the problem, the approach, test results, and any limitations.

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build:demo
```

Pull requests should pass all CI checks. Do not include real credentials, personal financial information, or production payment data in source files, test fixtures, screenshots, or logs. Never describe a simulated payment or synthetic test result as a real transaction or production validation.

## Financial and security-sensitive changes

- Keep payment eligibility and amount calculations deterministic and covered by tests.
- Do not give an AI model authority to approve or submit transfers.
- Preserve reserve protection, recipient verification, exact-term human approval, and independent receipt comparison.
- Treat provider responses, invoices, and model output as untrusted input.
- Report vulnerabilities privately to the project maintainers rather than opening a public issue with exploit details. Do not include secrets or live account data in a report.

## Pull request checklist

- [ ] The change has a clear, limited purpose.
- [ ] Tests cover changed behavior, including relevant blocked or invalid cases.
- [ ] Lint, typecheck, tests, and the demo build pass locally.
- [ ] Documentation and setup instructions are updated when needed.
- [ ] No secrets, real payment data, or unrelated generated artifacts are included.
