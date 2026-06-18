#!/usr/bin/env python3
"""
Project Consolidator — Bushal Edition
======================================
Recursively scans the project root and concatenates all text-based source files
into a single `all.txt` output. Respects common exclusions (env, secrets, 
binary blobs, lockfiles, venv, etc.).

Usage:
    python consolidate_project.py

Output:
    ./all.txt   (in the same directory as this script)
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# ─── CONFIGURATION ──────────────────────────────────────────────────────────

# Files/directories to EXCLUDE by name (exact match)
EXCLUDED_NAMES = {
    # Version control
    '.git',
    '.gitignore',
    '.github',

    # Node.js
    'node_modules',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',

    # Python
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.ruff_cache',
    'venv',
    '.venv',
    'env',
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    '.python-version',

    # Build outputs
    'dist',
    'build',
    '.next',
    'out',
    'coverage',
    '.turbo',

    # IDE
    '.vscode',
    '.idea',
    '.DS_Store',

    # Misc
    'all.txt',              # Don't include previous output
    'playwright-report',
    'test-results',
    'list of all upozillas bangladesh.pdf',  # Your specific PDF exclusion
}

# File extensions to SKIP (binary/non-text)
EXCLUDED_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',  # images (keep .svg if you want)
    '.ico', '.icns',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.db', '.sqlite', '.sqlite3',
    '.lock',  # lockfiles
}

# File extensions to ALWAYS INCLUDE (source code)
INCLUDED_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py',
    '.sql',
    '.css', '.scss', '.sass', '.less',
    '.html', '.htm', '.xml',
    '.json',
    '.md', '.mdx',
    '.yml', '.yaml',
    '.sh', '.bash', '.zsh',
    '.dockerfile', '.ini', '.cfg', '.conf',
    '.prisma',
    '.txt',
}

# Max file size (in bytes) — skip files larger than this
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

# ─── CORE LOGIC ─────────────────────────────────────────────────────────────

def should_include_file(file_path: Path, root: Path) -> bool:
    """
    Determine if a file should be included in the output.
    Returns True if the file should be included, False otherwise.
    """
    # Check exact name exclusions
    if file_path.name in EXCLUDED_NAMES:
        return False

    # Check if any parent directory is excluded
    for parent in file_path.relative_to(root).parents:
        if parent.name in EXCLUDED_NAMES:
            return False

    # Check extension
    ext = file_path.suffix.lower()
    if ext in EXCLUDED_EXTENSIONS:
        return False

    # If extension is in our explicit include list, include it
    if ext in INCLUDED_EXTENSIONS:
        return True

    # For files with no extension or unknown extension, check if they're text
    # by attempting to read a small portion
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            # Check for null bytes (indicates binary)
            if b'\x00' in chunk:
                return False
            # Try to decode as UTF-8
            chunk.decode('utf-8')
            return True
    except (UnicodeDecodeError, PermissionError, OSError):
        return False


def get_file_language_tag(file_path: Path) -> str:
    """Return a language identifier for syntax highlighting context."""
    ext_map = {
        '.ts': 'typescript', '.tsx': 'tsx',
        '.js': 'javascript', '.jsx': 'jsx', '.mjs': 'javascript', '.cjs': 'javascript',
        '.py': 'python',
        '.sql': 'sql',
        '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
        '.html': 'html', '.htm': 'html', '.xml': 'xml',
        '.json': 'json',
        '.md': 'markdown', '.mdx': 'mdx',
        '.yml': 'yaml', '.yaml': 'yaml',
        '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh',
        '.dockerfile': 'dockerfile',
        '.prisma': 'prisma',
    }
    return ext_map.get(file_path.suffix.lower(), '')


def consolidate_project(root_dir: Path, output_file: Path):
    """
    Main function: scans project and writes consolidated output.
    """
    if not root_dir.exists():
        print(f"❌ Error: Root directory does not exist: {root_dir}")
        sys.exit(1)

    # Collect all files to include
    files_to_include = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Filter out excluded directories in-place (prevents os.walk from descending)
        dirnames[:] = [
            d for d in dirnames 
            if d not in EXCLUDED_NAMES
        ]

        for filename in filenames:
            file_path = Path(dirpath) / filename

            if should_include_file(file_path, root_dir):
                # Check file size
                try:
                    if file_path.stat().st_size > MAX_FILE_SIZE:
                        print(f"⚠️  Skipping (too large): {file_path.relative_to(root_dir)}")
                        continue
                except OSError:
                    continue

                files_to_include.append(file_path)

    # Sort files for consistent output
    files_to_include.sort(key=lambda p: str(p.relative_to(root_dir)).lower())

    print(f"📁 Found {len(files_to_include)} files to consolidate")
    print(f"📝 Writing to: {output_file}")

    # Write output
    with open(output_file, 'w', encoding='utf-8') as out:
        # Header
        out.write("=" * 80 + "\n")
        out.write("PROJECT CONSOLIDATION OUTPUT\n")
        out.write(f"Generated: {datetime.now().isoformat()}\n")
        out.write(f"Root: {root_dir.resolve()}\n")
        out.write(f"Total Files: {len(files_to_include)}\n")
        out.write("=" * 80 + "\n\n")

        # Write each file
        for i, file_path in enumerate(files_to_include, 1):
            rel_path = file_path.relative_to(root_dir)
            lang = get_file_language_tag(file_path)

            # File header
            out.write("\n")
            out.write("// " + "─" * 78 + "\n")
            out.write(f"// File {i}/{len(files_to_include)}: {rel_path}\n")
            if lang:
                out.write(f"// Language: {lang}\n")
            out.write("// " + "─" * 78 + "\n")
            out.write("\n")

            # File content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Ensure file ends with newline for clean concatenation
                    if content and not content.endswith('\n'):
                        content += '\n'
                    out.write(content)
            except Exception as e:
                out.write(f"\n// ERROR reading file: {e}\n")

            # Progress indicator in console
            if i % 50 == 0 or i == len(files_to_include):
                print(f"   Progress: {i}/{len(files_to_include)} files written")

    # Final stats
    output_size = output_file.stat().st_size
    print(f"\n✅ Done!")
    print(f"   Output file: {output_file}")
    print(f"   Size: {output_size / 1024:.1f} KB ({output_size / (1024*1024):.2f} MB)")
    print(f"   Files included: {len(files_to_include)}")


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Determine script location (project root)
    script_path = Path(__file__).resolve()
    project_root = script_path.parent

    # Output file in same directory as script
    output_path = project_root / "all.txt"

    print("=" * 60)
    print("BUSHAL PROJECT CONSOLIDATOR")
    print("=" * 60)
    print(f"Project root: {project_root}")
    print(f"Output file:  {output_path}")
    print("-" * 60)

    # Warn if output already exists
    if output_path.exists():
        print("⚠️  Output file already exists. It will be overwritten.")
        response = input("   Continue? [Y/n]: ").strip().lower()
        if response and response not in ('y', 'yes'):
            print("Aborted.")
            sys.exit(0)

    consolidate_project(project_root, output_path)
