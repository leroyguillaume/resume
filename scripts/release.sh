#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/release.sh [--dry-run] <version>

Set <version> in package.json and package-lock.json, commit, create the
annotated tag v<version>, then ask before pushing. Pushing the tag starts the
release workflow, which renders the PDFs and attaches them to a GitHub Release.

Options:
  --dry-run   print what would happen and change nothing
  -h, --help  show this help

Examples:
  scripts/release.sh 1.0.0
  scripts/release.sh --dry-run 1.1.0
EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

dry_run=false
version=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --dry-run) dry_run=true ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *)
      [ -z "$version" ] || die "only one version may be given"
      version="$1"
      ;;
  esac
  shift
done

if [ -z "$version" ]; then
  usage >&2
  exit 1
fi
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$ ]] ||
  die "\"$version\" is not a semver version (expected X.Y.Z)"

cd "$(git rev-parse --show-toplevel)"

tag="v$version"
current="$(node -p 'require("./package.json").version')"
subject="release $tag"

[ "$version" != "$current" ] || die "package.json is already at $version"
[ -z "$(git status --porcelain)" ] || die "the working tree is not clean; commit or stash first"

branch="$(git symbolic-ref --quiet --short HEAD)" || die "HEAD is detached; check out the default branch"
default_branch="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)" ||
  die "origin/HEAD is not set; run: git remote set-head origin --auto"
default_branch="${default_branch#origin/}"
[ "$branch" = "$default_branch" ] || die "releases are cut from $default_branch, not $branch"

git fetch --quiet --tags origin "$branch"
behind="$(git rev-list --count "HEAD..origin/$branch")"
[ "$behind" -eq 0 ] || die "$branch is $behind commit(s) behind origin; pull first"

if git rev-parse --quiet --verify "refs/tags/$tag" >/dev/null; then
  die "tag $tag already exists"
fi

if [ "$dry_run" = true ]; then
  printf 'current version: %s\ntarget version:  %s\ncommit subject:  %s\ntag:             %s\n' \
    "$current" "$version" "$subject" "$tag"
  exit 0
fi

npm version "$version" --no-git-tag-version >/dev/null
git add package.json package-lock.json
git commit --quiet --message "$subject"
git tag --annotate "$tag" --message "$tag"
printf 'created commit "%s" and tag %s\n' "$subject" "$tag"

push_command="git push --atomic origin $branch $tag"
if [ ! -t 0 ]; then
  printf 'no terminal to confirm the push; publish later with:\n  %s\n' "$push_command"
  exit 0
fi

printf 'push %s and %s to origin? this publishes the release. [y/N] ' "$branch" "$tag"
read -r reply
case "$reply" in
  y | Y | yes | YES) $push_command ;;
  *) printf 'not pushed; publish later with:\n  %s\n' "$push_command" ;;
esac
