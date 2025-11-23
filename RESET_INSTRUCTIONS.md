# Instructions for Resetting Local Branches After History Rewrite

Since the git history was rewritten to remove secrets from `.env` files, all commit hashes have changed. If you have a local clone of this repository, you'll need to reset your local branches.

## Option 1: Fresh Clone (Easiest - Recommended)

If you don't have important uncommitted local changes:

```bash
# Backup any uncommitted changes first
cd /path/to/lifepilot
git stash  # Save any uncommitted changes

# Delete the local repository and clone fresh
cd ..
rm -rf lifepilot
git clone https://github.com/naviraaah/lifepilot.git
cd lifepilot

# Restore your stashed changes if needed
git stash pop
```

## Option 2: Reset Existing Clone

If you want to keep your local repository:

```bash
cd /path/to/lifepilot

# Backup any uncommitted changes
git stash

# Fetch the latest from remote
git fetch origin

# Reset your main branch to match remote (WARNING: This discards local commits)
git checkout main
git reset --hard origin/main

# If you have other branches, reset them too
git checkout <branch-name>
git reset --hard origin/<branch-name>

# Restore your stashed changes if needed
git stash pop
```

## Option 3: If You Have Local Commits You Want to Keep

If you have local commits that aren't on the remote yet:

```bash
cd /path/to/lifepilot

# Create a backup branch with your current work
git branch backup-before-reset

# Fetch the rewritten history
git fetch origin

# Reset main to match remote
git checkout main
git reset --hard origin/main

# Cherry-pick or rebase your local commits onto the new history
# (You'll need to manually identify which commits are yours)
git cherry-pick <commit-hash-1> <commit-hash-2> ...

# Or if you have a feature branch:
git checkout -b my-feature-branch
git cherry-pick <your-commit-hashes>
```

## Important Notes

- **All commit hashes have changed** - Any references to old commit hashes (in documentation, issues, etc.) are now invalid
- **Force push was used** - The remote history was rewritten, so `git pull` won't work normally
- **Backup first** - Always backup or stash uncommitted changes before resetting
- **Coordinate with team** - Make sure everyone knows about the history rewrite

## Verify It Worked

After resetting, verify your local branch matches remote:

```bash
git log --oneline -5
git status  # Should show "Your branch is up to date with 'origin/main'"
```

