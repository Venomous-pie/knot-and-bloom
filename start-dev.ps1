# Knot & Bloom — Dev Server Launcher
# Opens Windows Terminal with split panes: frontend (left) | backend (right)

$root     = Split-Path -Parent $MyInvocation.MyCommand.Definition
$frontend = Join-Path $root "frontend"
$backend  = Join-Path $root "backend"

$wtArgs = (
    "new-tab",
    "--title", "Frontend",
    "--startingDirectory", $frontend,
    "powershell.exe", "-NoExit", "-Command", "npx expo start --web",
    ";",
    "split-pane",
    "--title", "Backend",
    "--startingDirectory", $backend,
    "powershell.exe", "-NoExit", "-Command", "npm run dev"
)

Start-Process wt -ArgumentList $wtArgs
