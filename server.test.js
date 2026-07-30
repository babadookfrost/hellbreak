const assert = require('assert');
const http = require('http');
const { server, Room, distSq } = require('./server');

describe('Server', () => {
    describe('distSq', () => {
        it('should correctly calculate the squared distance between two points', () => {
            const distance = distSq(0, 0, 3, 4);
            assert.strictEqual(distance, 25);
        });
    });

    describe('Room', () => {
        it('should initialize correctly with given name', () => {
            const room = new Room('test-room');
            assert.strictEqual(room.name, 'test-room');
            assert.strictEqual(room.aliveCount, 0);
            assert.strictEqual(room.running, false);
        });
    });

    describe('HTTP Server', () => {
        const TEST_PORT = 3001;

        before((done) => {
            server.listen(TEST_PORT, () => {
                done();
            });
        });

        after((done) => {
            server.close(() => {
                done();
            });
        });

        it('should return 200 OK for root route', (done) => {
            http.get(`http://localhost:${TEST_PORT}/`, (res) => {
                assert.strictEqual(res.statusCode, 200);

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    done();
                });
            }).on('error', (err) => {
                done(err);
            });
        });
    });
});
