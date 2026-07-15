# Contributing Guidelines

Thanks for your interest in contributing to Schema Pad.

To help us review quickly and keep the project consistent, please prefer small, focused contributions.

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the dev server**
   ```bash
   npm run dev
   ```
3. **Open in the browser**
   [http://localhost:3000](http://localhost:3000)

## 1) Contributions We Usually Accept

- Targeted bug fixes
- Reliability improvements
- Performance improvements
- Focused maintenance updates that improve quality without changing project direction

## 2) Avoid These Contributions

- Very large PRs that are difficult to review
- New feature works without prior discussion with the community
- Broad rewrites without a clear need
- Changes that expand product scope without discussion with the community

## 3) If You Open a Pull Request (PR)

- Keep the PR small and focused on one topic
- Explain clearly what changed
- Explain why the change is needed
- Avoid mixing unrelated fixes in a single PR
- For UI changes, please include clear before/after images
- For interaction, motion, or timing changes, please include a short video
- Make changes easy to review and verify

## 4) Issue first, PR later

- Open an issue before opening a PR so that we can discuss the changes and get feedback from the community   
- Early discussion helps confirm the scope and approach, aligning
- This is the preferred way to contribute to the project as it helps avoid unnecessary work
- Once an issue is confirmed, you can open a PR for the changes and connect it to the issue by mentioning the issue number in the PR description

## 5) UI/UX guidelines

SchemaPad works because it adheres to and upholds high-quality UI. Keep it that way.

- Match existing UI patterns (layout, spacing, typography, interactions)
- Reuse components, do not rebuild what already exists
- Avoid new styles, patterns, or one-off behaviors
- Keep UI minimal, clear, and predictable
- Maintain consistent labels, icons, and interactions across the app
- If something feels “new” or different, consider discussing it first

### Assets and icons
- Use Phosphor React (already installed icon pack) when you require icons
- Follow existing import/usage patterns
- Do **not** add new SVGs or **icon libraries** unless necessary/required
- PRs adding random assets or new icon **systems** will be rejected

## 6) Merging PRs
- PRs will be merged by the maintainers after review and testing
- If your test fails, please fix the test and resubmit the PR
- If your PR is not merged, please don't be discouraged. Give it some time and tag the maintainers in the PR comments for further discussion

THANKS FOR CONTRIBUTING TO SCHEMA PAD! KEEP HACKING 🎉
