const { spawn } = require('child_process');

const args = process.argv.slice(2);

// Spawn the Expo CLI process
const child = spawn(
    'npx',
    ['cross-env', 'NODE_OPTIONS=--max-old-space-size=8192', 'expo', 'start', ...args],
    {
        env: process.env,
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe'] // Inherit stdin, pipe stdout/stderr
    }
);

let loadedEnvCount = 0;
let hasPrintedEnv = false;

function processLog(data) {
    const lines = data.toString().split('\n');

    for (let line of lines) {
        if (!line.trim()) continue;

        // Clean up the `env: load .env` spam
        if (line.includes('env: load .env')) {
            continue; // Hide this line completely
        }
        
        if (line.includes('env: export')) {
            const matches = line.match(/export (.*)/);
            if (matches && matches[1]) {
                const vars = matches[1].split(' ').filter(Boolean);
                loadedEnvCount += vars.length;
            }
            // Only print a summary once, instead of multiple export lines
            if (!hasPrintedEnv) {
                console.log(`\x1b[32m✔ [ENV]\x1b[0m Successfully loaded environment variables`);
                hasPrintedEnv = true;
            }
            continue;
        }

        // Clean up "Starting project at ..."
        if (line.includes('Starting project at')) {
            console.log('\n\x1b[36m============================================================\x1b[0m');
            console.log('\x1b[35m✨ Starting Knot & Bloom Frontend (Expo Metro)\x1b[0m');
            console.log('\x1b[36m============================================================\x1b[0m\n');
            continue;
        }

        // Clean up web compiling messages
        if (line.includes('Web bundling')) {
            console.log(`\x1b[34mℹ [BUNDLER]\x1b[0m ${line.trim()}`);
            continue;
        }

        // Print all other logs normally
        process.stdout.write(line + '\n');
    }
}

child.stdout.on('data', processLog);
child.stderr.on('data', processLog);

child.on('close', (code) => {
    process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit();
});
process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit();
});
