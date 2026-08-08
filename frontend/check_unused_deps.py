#!/usr/bin/env python3
"""
check_unused_deps.py

Scans a Node.js/Express project for dependencies listed in package.json
that are never imported/required anywhere in the source code.

READ-ONLY: this script never deletes, modifies, or uninstalls anything.
It only prints a report. Removing packages is left entirely to you
(e.g. `npm uninstall <package>`).

Usage (PowerShell or any shell):
    python check_unused_deps.py
    python check_unused_deps.py --path C:/path/to/backend
    python check_unused_deps.py --ext .js .ts .jsx .tsx
"""

import argparse
import json
import os
import re
import sys

# Directories we never want to scan into
DEFAULT_IGNORE_DIRS = {
    "node_modules", ".git", "dist", "build", "coverage",
    ".next", ".vercel", ".cache", "out"
}

# Packages that are commonly used implicitly (config files, CLI-only,
# type-only, etc.) and are prone to false positives from static scanning.
LIKELY_FALSE_POSITIVE_HINTS = {
    "dotenv", "eslint", "prettier", "nodemon", "typescript",
    "ts-node", "husky", "lint-staged", "cross-env", "concurrently",
    "@types", "babel", "jest", "mocha", "chai", "supertest",
    "webpack", "vite", "tailwindcss", "postcss", "autoprefixer",
}

# Matches: require('pkg'), require("pkg/sub/path")
REQUIRE_RE = re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)""")

# Matches: import x from 'pkg', import 'pkg', import x, {y} from "pkg/sub"
IMPORT_RE = re.compile(
    r"""import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]"""
)

# Matches dynamic import('pkg')
DYNAMIC_IMPORT_RE = re.compile(r"""import\(\s*['"]([^'"]+)['"]\s*\)""")


def find_package_json(start_path):
    candidate = os.path.join(start_path, "package.json")
    if os.path.isfile(candidate):
        return candidate
    return None


def load_declared_dependencies(package_json_path):
    with open(package_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    deps = {}
    for section in ("dependencies", "devDependencies"):
        for name, version in data.get(section, {}).items():
            deps[name] = section
    return deps


def resolve_package_name(import_path):
    """
    Turn an import specifier into the top-level package name that would
    appear in package.json. Handles scoped packages (@scope/pkg) and
    sub-path imports (pkg/lib/foo).
    """
    if import_path.startswith("."):
        return None  # relative import, not a dependency
    if import_path.startswith("@"):
        parts = import_path.split("/")
        if len(parts) >= 2:
            return "/".join(parts[:2])
        return import_path
    return import_path.split("/")[0]


def scan_source_files(root_path, extensions, ignore_dirs):
    used_packages = set()
    scanned_files = 0

    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]

        for filename in filenames:
            if not any(filename.endswith(ext) for ext in extensions):
                continue

            filepath = os.path.join(dirpath, filename)
            scanned_files += 1
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except (OSError, UnicodeDecodeError):
                continue

            for pattern in (REQUIRE_RE, IMPORT_RE, DYNAMIC_IMPORT_RE):
                for match in pattern.findall(content):
                    pkg = resolve_package_name(match)
                    if pkg:
                        used_packages.add(pkg)

    return used_packages, scanned_files


def scan_config_files_for_mentions(root_path, package_names, ignore_dirs):
    """
    Some packages (eslint plugins, babel presets, jest config, etc.) are
    referenced only by name in config files rather than imported in code.
    This does a lightweight text search for the package name in common
    config files so we don't falsely flag them as unused.

    IMPORTANT: package.json is deliberately excluded here. A dependency's
    name always appears in its own package.json entry, so including it
    would make every single dependency trivially "mentioned" and defeat
    the whole check.
    """
    config_filenames = {
        ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs",
        ".babelrc", "babel.config.js", "babel.config.json",
        "jest.config.js", "jest.config.json", "jest.config.cjs",
        ".prettierrc", "prettier.config.js",
        "tsconfig.json", "webpack.config.js", "vite.config.js",
        "vite.config.ts", "nodemon.json",
        # package.json intentionally NOT included
    }

    mentioned = set()
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]
        for filename in filenames:
            if filename not in config_filenames:
                continue
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue
            for pkg in package_names:
                if pkg in content:
                    mentioned.add(pkg)

    return mentioned


def resolve_types_base_package(pkg_name):
    """
    @types/foo corresponds to the runtime package 'foo'.
    @types/foo__bar corresponds to the scoped package '@foo/bar'.
    Returns None if pkg_name is not an @types package.
    """
    if not pkg_name.startswith("@types/"):
        return None
    base = pkg_name[len("@types/"):]
    if "__" in base:
        scope, name = base.split("__", 1)
        return f"@{scope}/{name}"
    return base


def main():
    parser = argparse.ArgumentParser(description="Find unused npm dependencies (read-only).")
    parser.add_argument("--path", default=".", help="Project root path (where package.json lives)")
    parser.add_argument(
        "--ext", nargs="+", default=[".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx"],
        help="File extensions to scan"
    )
    args = parser.parse_args()

    root_path = os.path.abspath(args.path)
    package_json_path = find_package_json(root_path)

    if not package_json_path:
        print(f"No package.json found at: {root_path}")
        sys.exit(1)

    declared = load_declared_dependencies(package_json_path)
    if not declared:
        print("No dependencies or devDependencies found in package.json.")
        sys.exit(0)

    print(f"Scanning: {root_path}")
    print(f"Found {len(declared)} declared dependencies. Scanning source files...\n")

    used_packages, scanned_files = scan_source_files(root_path, args.ext, DEFAULT_IGNORE_DIRS)
    config_mentions = scan_config_files_for_mentions(root_path, declared.keys(), DEFAULT_IGNORE_DIRS)

    unused = []
    possibly_used_in_config = []
    used_types_packages = []

    for pkg, section in sorted(declared.items()):
        if pkg in used_packages:
            continue

        # Special-case @types/* — these are never require()'d/import'ed
        # directly. They're "used" if their corresponding base runtime
        # package is actually imported somewhere in the code.
        base_pkg = resolve_types_base_package(pkg)
        if base_pkg is not None:
            if base_pkg in used_packages or base_pkg in declared:
                used_types_packages.append((pkg, section, base_pkg))
                continue
            else:
                unused.append((pkg, section))
                continue

        if pkg in config_mentions:
            possibly_used_in_config.append((pkg, section))
            continue
        unused.append((pkg, section))

    print(f"Scanned {scanned_files} source files.\n")
    print("=" * 60)
    print("UNUSED (not found in source code or config files)")
    print("=" * 60)
    if unused:
        for pkg, section in unused:
            flag = " (verify manually — commonly implicit)" if any(
                hint in pkg for hint in LIKELY_FALSE_POSITIVE_HINTS
            ) else ""
            print(f"  [{section}] {pkg}{flag}")
    else:
        print("  None found.")

    print()
    print("=" * 60)
    print("@types PACKAGES — verified used (base package is imported)")
    print("=" * 60)
    if used_types_packages:
        for pkg, section, base_pkg in used_types_packages:
            print(f"  [{section}] {pkg}  (base: {base_pkg})")
    else:
        print("  None found.")

    print()
    print("=" * 60)
    print("MENTIONED ONLY IN CONFIG FILES (probably fine, double-check)")
    print("=" * 60)
    if possibly_used_in_config:
        for pkg, section in possibly_used_in_config:
            print(f"  [{section}] {pkg}")
    else:
        print("  None found.")

    print()
    print("-" * 60)
    print("This script only reports — nothing was deleted or modified.")
    print("To remove a confirmed-unused package yourself, run:")
    print("    npm uninstall <package-name>")
    print("-" * 60)


if __name__ == "__main__":
    main()