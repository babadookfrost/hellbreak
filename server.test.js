const test = require('node:test');
const assert = require('node:assert');
const { distSq, dist } = require('./server');

test('dist function', async (t) => {
    await t.test('distance between identical points should be 0', () => {
        assert.strictEqual(dist(0, 0, 0, 0), 0);
        assert.strictEqual(dist(5, 5, 5, 5), 0);
        assert.strictEqual(dist(-3, -2, -3, -2), 0);
    });

    await t.test('distance between positive coordinates', () => {
        // (0,0) to (3,4) distance should be sqrt(3^2 + 4^2) = 5
        assert.strictEqual(dist(0, 0, 3, 4), 5);
        assert.strictEqual(dist(1, 1, 4, 5), 5);

        // (10, 10) to (15, 22) distance should be sqrt(5^2 + 12^2) = 13
        assert.strictEqual(dist(10, 10, 15, 22), 13);
    });

    await t.test('distance involving negative coordinates', () => {
        // (-3,-4) to (0,0) distance should be sqrt((-3)^2 + (-4)^2) = 5
        assert.strictEqual(dist(-3, -4, 0, 0), 5);

        // (-1,-1) to (-4,-5) distance should be sqrt((-3)^2 + (-4)^2) = 5
        assert.strictEqual(dist(-1, -1, -4, -5), 5);

        // (-5, 3) to (7, -2) distance should be sqrt(12^2 + (-5)^2) = 13
        assert.strictEqual(dist(-5, 3, 7, -2), 13);
    });

    await t.test('distance logic (commutativity)', () => {
        // Order of points shouldn't matter
        assert.strictEqual(dist(10, 20, 30, 40), dist(30, 40, 10, 20));
        assert.strictEqual(dist(-5, -15, 25, 35), dist(25, 35, -5, -15));
    });
});

test('distSq function', async (t) => {
    await t.test('distance between identical points should be 0', () => {
        assert.strictEqual(distSq(0, 0, 0, 0), 0);
        assert.strictEqual(distSq(5, 5, 5, 5), 0);
        assert.strictEqual(distSq(-3, -2, -3, -2), 0);
    });

    await t.test('distance between positive coordinates', () => {
        // (0,0) to (3,4) squared distance should be 3^2 + 4^2 = 9 + 16 = 25
        assert.strictEqual(distSq(0, 0, 3, 4), 25);
        assert.strictEqual(distSq(1, 1, 4, 5), 25);

        // (10, 10) to (15, 22) squared distance should be 5^2 + 12^2 = 25 + 144 = 169
        assert.strictEqual(distSq(10, 10, 15, 22), 169);
    });

    await t.test('distance involving negative coordinates', () => {
        // (-3,-4) to (0,0) squared distance should be 3^2 + 4^2 = 25
        assert.strictEqual(distSq(-3, -4, 0, 0), 25);

        // (-1,-1) to (-4,-5) squared distance should be (-3)^2 + (-4)^2 = 25
        assert.strictEqual(distSq(-1, -1, -4, -5), 25);

        // (-5, 3) to (7, -2) squared distance should be 12^2 + (-5)^2 = 144 + 25 = 169
        assert.strictEqual(distSq(-5, 3, 7, -2), 169);
    });

    await t.test('distance logic (commutativity)', () => {
        // Order of points shouldn't matter
        assert.strictEqual(distSq(10, 20, 30, 40), distSq(30, 40, 10, 20));
        assert.strictEqual(distSq(-5, -15, 25, 35), distSq(25, 35, -5, -15));
    });
});
