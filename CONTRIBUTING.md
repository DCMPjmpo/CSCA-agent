# Contributing to CSCA Pilot Agent

Thank you for your interest in contributing to CSCA Pilot Agent! This guide will help you get started and ensure a smooth collaboration.

## How to Contribute

| Contribution type | What to do |
| --- | --- |
| **Bug fix** | Open a PR directly (link the issue if one exists) |
| **Extending existing features** (e.g. adding a new model provider, new TTS engine) | Open a PR directly |
| **New feature or architecture change** | Open a GitHub Discussion **before** opening a PR |
| **Design / UI change** | Discuss first — include mockups or screenshots |
| **Refactor-only PR** | Not accepted unless a maintainer explicitly requests it |
| **Documentation** | Open a PR directly |
| **Question** | Open a GitHub Discussion |

## Claiming Issues

To avoid duplicate effort, please **comment on an issue** to claim it before you start working. A maintainer will assign it to you.

---

## Development Setup

### Prerequisites

- **Node.js** >= 20.9.0
- **pnpm** >= 10

### Install & Run

```bash
git clone https://github.com/DCMPjmpo/CSCA-agent.git
cd CSCA-agent
pnpm install
cp .env.example .env.local
# Configure at least one LLM provider API key in .env.local
pnpm dev
```

### Code Quality

```bash
pnpm check     # Prettier formatting check
pnpm lint      # ESLint
npx tsc --noEmit  # TypeScript type check
pnpm check:i18n-keys  # i18n key alignment
pnpm test      # Vitest unit tests
pnpm test:e2e  # Playwright e2e tests
```

All of the above must pass before merging. The CI pipeline runs these checks automatically on push and pull requests.

---

## Project Structure

```
CSCA-agent/
├── app/                        # Next.js App Router
│   ├── api/                    # Server-side API routes
│   ├── csca/                   # CSCA core feature pages
│   └── page.tsx                # Home page
├── lib/                        # Core business logic
│   ├── ai/                     # LLM provider abstraction
│   ├── csca/                   # CSCA business core
│   ├── orchestration/          # Multi-agent orchestration
│   ├── i18n/                   # Internationalization
│   ├── store/                  # Zustand state management
│   └── server/                 # Server-side utilities
├── components/                 # React UI components
├── tests/                      # Unit tests (Vitest)
├── e2e/                        # End-to-end tests (Playwright)
└── configs/                    # Configuration files
```

---

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues in commit messages (e.g. `Fix #123: ...`)
- Keep commits focused — one logical change per commit

## Pull Request Checklist

- [ ] Code passes `pnpm check` (Prettier)
- [ ] Code passes `pnpm lint` (ESLint)
- [ ] Code passes `npx tsc --noEmit` (TypeScript)
- [ ] Code passes `pnpm check:i18n-keys` (i18n alignment)
- [ ] Unit tests pass (`pnpm test`)
- [ ] New features include tests
- [ ] No secrets or API keys committed

---

## License

This project is based on [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) and follows the [AGPL-3.0](LICENSE) license. By contributing, you agree that your contributions will be licensed under the same license.
