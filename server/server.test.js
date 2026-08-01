const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

test('Server should not crash on invalid JSON WebSocket message', async (t) => {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn(process.execPath, ['server/server']);

        let exited = false;

        serverProcess.on('exit', (code, signal) => {
            exited = true;
            if (signal !== 'SIGTERM') {
                reject(new Error(`Server crashed with code ${code} and signal ${signal}`));
            }
        });

        // Wait for server to be ready based on stdout
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Hellbreak сервер запущен')) {
                const ws = new WebSocket('ws://localhost:3000');

                ws.on('open', () => {
                    // First join a room to trigger Room.addPlayer which attaches the message handler
                    ws.send(JSON.stringify({ type: 'join', room: 'testroom', name: 'tester' }));

                    // Listen to server broadcast to know when we've joined
                    ws.on('message', (raw) => {
                        try {
                            const msg = JSON.parse(raw);
                            if (msg.type === 'init') {
                                // Now we know the player is fully added and handlers are attached
                                // Send invalid JSON
                                ws.send('INVALID JSON {[');

                                setTimeout(() => {
                                    assert.strictEqual(exited, false, 'Server should not have exited');
                                    serverProcess.kill();
                                    resolve();
                                }, 500); // Small wait to allow server to potentially crash if it's going to
                            }
                        } catch(e) {}
                    });
                });

                ws.on('error', (err) => {
                    serverProcess.kill();
                    reject(err);
                });
            }
        });

    });
});
