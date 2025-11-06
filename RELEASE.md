# ABOUTME: Release process documentation for ClaudeCode MacMenu
# ABOUTME: Step-by-step instructions for creating and publishing new releases

# Release Process

## Quick Start

```bash
# For patch releases (bug fixes): 0.1.0 → 0.1.1
make release-patch

# For minor releases (new features): 0.1.0 → 0.2.0
make release-minor

# For specific versions
make release VERSION=1.0.0
```

## Full Release Workflow

### 1. Pre-Release Checklist

- [ ] All tests pass: `make test`
- [ ] Working directory is clean: `make check-release`
- [ ] On main branch: `git branch`
- [ ] Latest changes pulled: `git pull origin main`
- [ ] CHANGELOG.md updated (if you maintain one)

### 2. Create Release

```bash
# Option A: Auto-increment patch version
make release-patch

# Option B: Auto-increment minor version
make release-minor

# Option C: Specify exact version
make release VERSION=0.2.0
```

**What happens:**
1. Updates `package.json` version
2. Builds application (`npm run build`)
3. Packages DMG and ZIP (`npm run package`)
4. Creates git commit: "Bump version to X.X.X"
5. Creates git tag: `vX.X.X`
6. Pushes to GitHub with tags

### 3. GitHub Actions (Automatic)

Once the tag is pushed, GitHub Actions will:
1. Checkout code
2. Install dependencies
3. Build application
4. Package DMG and ZIP
5. Create GitHub Release
6. Upload artifacts (DMG + ZIP)
7. Generate release notes

**Monitor:** https://github.com/PiXeL16/claudecode-macmenu/actions

### 4. Update Homebrew Cask

After GitHub release is published:

```bash
# This creates a PR to homebrew/cask
brew bump-cask-pr claudecode-macmenu --version=0.2.0
```

Or manually update the cask formula at:
https://github.com/Homebrew/homebrew-cask/blob/master/Casks/c/claudecode-macmenu.rb

## Manual Release (Without Makefile)

If you need to create a release manually:

```bash
# 1. Update version
npm version 0.2.0 --no-git-tag-version

# 2. Build
npm run build

# 3. Package
npm run package

# 4. Commit and tag
git add package.json package-lock.json
git commit -m "Bump version to 0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0"

# 5. Push
git push origin main --tags
```

## Troubleshooting

### Release fails with "VERSION not specified"

```bash
# Bad
make release

# Good
make release VERSION=0.2.0
# or
make release-patch
```

### GitHub Actions fails

1. Check Actions tab: https://github.com/PiXeL16/claudecode-macmenu/actions
2. Verify `GITHUB_TOKEN` permissions in Settings → Actions
3. Check build logs for errors

### Homebrew cask update fails

1. Verify release is published on GitHub
2. Ensure DMG/ZIP are attached to release
3. Check cask formula syntax: `brew style claudecode-macmenu`
4. Try manual PR to homebrew-cask repo

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

Examples:
- `0.1.0 → 0.1.1` - Bug fix
- `0.1.0 → 0.2.0` - New feature
- `0.9.0 → 1.0.0` - Stable release

## Post-Release

1. Update release notes on GitHub if needed
2. Submit to Homebrew Cask (first-time only):
   - Fork [Homebrew/homebrew-cask](https://github.com/Homebrew/homebrew-cask)
   - Create branch: `git checkout -b claude-code-macmenu`
   - Copy `homebrew/claudecode-macmenu.rb` to `Casks/c/claude-code-macmenu.rb`
   - Test: `brew audit --new --cask claude-code-macmenu && brew install --cask claude-code-macmenu`
   - Commit: `claude-code-macmenu 0.2.0 (new cask)`
   - Open PR to Homebrew/homebrew-cask
3. Announce on social media / Discord / etc.
4. Monitor issues for bugs
5. Plan next release

## Emergency Rollback

If a release has critical bugs:

```bash
# Revert the commit
git revert <commit-hash>

# Delete the tag locally and remotely
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Delete the GitHub release (via web UI)
```

Then fix the bug and create a new patch release.
