# ABOUTME: Makefile for building, packaging, and releasing ClaudeCode MacMenu
# ABOUTME: Provides convenient commands for development and deployment workflows

.PHONY: help install build package release clean test

# Default target
help:
	@echo "ClaudeCode MacMenu - Build & Release"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build the application"
	@echo "  make package    - Package the app (DMG + ZIP)"
	@echo "  make release    - Create a new release (bump version, tag, push)"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make test       - Run tests"
	@echo "  make dev        - Build and run in development mode"
	@echo ""
	@echo "Release workflow:"
	@echo "  make release VERSION=0.2.0  - Bump to specific version and release"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Build the application
build:
	@echo "🔨 Building application..."
	npm run build

# Package for distribution
package: build
	@echo "📦 Packaging application..."
	npm run package
	@echo "✅ Package created in dist/"

# Development mode
dev:
	@echo "🚀 Running in development mode..."
	npm run dev

# Run tests
test:
	@echo "🧪 Running tests..."
	npm test

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/.cache/
	@echo "✅ Clean complete"

# Release workflow - bump version, tag, and push
release:
ifndef VERSION
	@echo "❌ Error: VERSION not specified"
	@echo "Usage: make release VERSION=0.2.0"
	@exit 1
endif
	@echo "🚀 Creating release $(VERSION)..."
	@echo "1️⃣ Updating version in package.json..."
	npm version $(VERSION) --no-git-tag-version
	@echo "2️⃣ Building application..."
	$(MAKE) build
	@echo "3️⃣ Packaging application..."
	npm run package
	@echo "4️⃣ Committing changes..."
	git add package.json package-lock.json
	git commit -m "Bump version to $(VERSION)"
	@echo "5️⃣ Creating git tag..."
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@echo "6️⃣ Pushing to GitHub..."
	git push origin main --tags
	@echo "✅ Release v$(VERSION) complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Go to https://github.com/PiXeL16/claudecode-macmenu/releases"
	@echo "  2. Draft a new release for tag v$(VERSION)"
	@echo "  3. Upload dist/Claude Code Menu-$(VERSION)-arm64.dmg"
	@echo "  4. Upload dist/Claude Code Menu-$(VERSION)-arm64-mac.zip"
	@echo "  5. Publish the release"
	@echo ""
	@echo "Or let GitHub Actions do it automatically! ✨"

# Quick release for patch versions (0.1.0 -> 0.1.1)
release-patch:
	@echo "🚀 Creating patch release..."
	$(eval NEW_VERSION := $(shell node -p "require('./package.json').version.split('.').map((n,i)=>i===2?parseInt(n)+1:n).join('.')"))
	$(MAKE) release VERSION=$(NEW_VERSION)

# Quick release for minor versions (0.1.0 -> 0.2.0)
release-minor:
	@echo "🚀 Creating minor release..."
	$(eval NEW_VERSION := $(shell node -p "const v=require('./package.json').version.split('.').map(Number);v[1]++;v[2]=0;v.join('.')"))
	$(MAKE) release VERSION=$(NEW_VERSION)

# Check if ready for release
check-release:
	@echo "🔍 Checking release readiness..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "❌ Working directory not clean. Commit or stash changes first."; \
		exit 1; \
	fi
	@echo "✅ Working directory is clean"
	@if [ "$$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then \
		echo "⚠️  Warning: Not on main branch"; \
	fi
	@echo "✅ Ready to release"

# Show current version
version:
	@node -p "'v' + require('./package.json').version"
