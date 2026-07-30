const { Room, UPGRADES, COLORS, distSq } = require('./server');

describe('Room class', () => {
    let mockWs;
    let room;

    beforeEach(() => {
        jest.useFakeTimers();
        mockWs = {
            send: jest.fn(),
            on: jest.fn(),
            readyState: 1 // WebSocket.OPEN
        };
        room = new Room('testRoom');
    });

    afterEach(() => {
        jest.clearAllTimers();
        if (room.running) {
            room.stopGame();
        }
    });

    test('constructor initializes default properties', () => {
        expect(room.name).toBe('testRoom');
        expect(room.players.size).toBe(0);
        expect(room.enemies.length).toBe(0);
        expect(room.projectiles.length).toBe(0);
        expect(room.gems.length).toBe(0);
        expect(room.time).toBe(0);
        expect(room.kills).toBe(0);
        expect(room.aliveCount).toBe(0);
        expect(room.running).toBe(false);
    });

    test('addPlayer creates a player, sets up state, and broadcasts', () => {
        const playerName = 'Player1';
        const player = room.addPlayer(mockWs, playerName);

        // Player state
        expect(player.id).toBe(0);
        expect(player.name).toBe(playerName);
        expect(player.color).toBe(COLORS[0]);
        expect(player.hp).toBe(100);
        expect(player.alive).toBe(true);
        expect(player.keys).toEqual({ w: false, a: false, s: false, d: false });

        // Room state
        expect(room.players.size).toBe(1);
        expect(room.players.get(0)).toBe(player);
        expect(room.aliveCount).toBe(1);

        // Messages sent
        expect(mockWs.send).toHaveBeenCalledTimes(2);

        // First message is init
        const initCall = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(initCall.type).toBe('init');
        expect(initCall.id).toBe(0);
        expect(initCall.color).toBe(COLORS[0]);

        // Second message is join broadcast (since this is the first player, their own ws gets the broadcast)
        const joinCall = JSON.parse(mockWs.send.mock.calls[1][0]);
        expect(joinCall.type).toBe('join');
        expect(joinCall.id).toBe(0);
        expect(joinCall.name).toBe(playerName);
    });

    test('addPlayer starts the game when the first player joins', () => {
        expect(room.running).toBe(false);
        room.addPlayer(mockWs, 'P1');
        expect(room.running).toBe(true);
        expect(room.interval).not.toBeNull();
    });

    test('startGame and stopGame manage running state and interval', () => {
        expect(room.running).toBe(false);
        expect(room.interval).toBeNull();

        room.startGame();

        expect(room.running).toBe(true);
        expect(room.interval).not.toBeNull();

        room.stopGame();

        expect(room.running).toBe(false);
        expect(room.interval).toBeNull();
    });

    test('tick logic - player movement', () => {
        const player = room.addPlayer(mockWs, 'P1');
        player.keys.w = true; // Move up
        player.keys.d = true; // Move right

        const initialX = player.x;
        const initialY = player.y;

        room.tick();

        // Player should have moved
        expect(player.x).toBeGreaterThan(initialX);
        expect(player.y).toBeLessThan(initialY); // 'w' subtracts from y
    });

    test('tick logic - enemy attacks player', () => {
        const player = room.addPlayer(mockWs, 'P1');

        // Place an enemy right on top of the player
        room.enemies.push({
            x: player.x,
            y: player.y,
            hp: 20,
            maxHp: 20,
            speed: 100,
            radius: 12,
            damage: 10,
            xp: 10,
            color: '#ff3300'
        });

        room.tick();

        // Player should take damage
        expect(player.hp).toBeLessThan(100);
    });
});
