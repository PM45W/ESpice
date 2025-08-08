# Interactive Website Isolation Plan

## Overview
Move the ESpice Interactive Architecture Explorer to a separate repository to reduce main codebase complexity and enable independent development.

## Current State
- **Location**: `docs/architecture/interactive-website/`
- **Size**: ~500+ files (including node_modules)
- **Type**: Self-contained React application
- **Dependencies**: Independent of main ESpice codebase

## Benefits
1. **Reduce Complexity**: ~500 fewer files in main repository
2. **Independent Development**: Can evolve separately
3. **Faster Builds**: Reduced dependencies and build time
4. **Better Organization**: Clear separation of concerns
5. **Easier Maintenance**: Simpler codebase structure

## Migration Steps

### Step 1: Create New Repository
```bash
# Create: espice-architecture-explorer
# URL: https://github.com/espice/espice-architecture-explorer
```

### Step 2: Copy Files
```bash
# Copy entire interactive-website directory
cp -r docs/architecture/interactive-website/* espice-architecture-explorer/
```

### Step 3: Update Configuration
- Update `package.json` with new repository info
- Update `vite.config.ts` for new structure
- Update `README.md` with new documentation

### Step 4: Set Up CI/CD
- Create GitHub Actions workflow
- Set up GitHub Pages deployment
- Configure automated builds

### Step 5: Update Main Repository
- Remove `docs/architecture/interactive-website/`
- Update documentation links
- Add reference to new repository

## Timeline
- **Day 1**: Create repository and copy files
- **Day 2**: Update configurations and test build
- **Day 3**: Set up deployment and validate
- **Day 4**: Update main repository and links
- **Day 5**: Final testing and cleanup

## Success Criteria
- [ ] Website builds successfully in new repository
- [ ] All functionality works correctly
- [ ] Deployment to GitHub Pages works
- [ ] Main repository is simplified
- [ ] No broken links or references

## Risk Mitigation
- Keep backup until validation complete
- Test thoroughly before removing from main repo
- Update all documentation references
- Monitor for any issues post-migration 