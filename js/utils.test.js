const { easeOutBack } = require('./utils.js');

describe('easeOutBack', () => {
    it('returns 0 when input is 0', () => {
        expect(easeOutBack(0)).toBeCloseTo(0, 5);
    });

    it('returns 1 when input is 1', () => {
        expect(easeOutBack(1)).toBe(1);
    });

    it('returns expected value for 0.5', () => {
        const x = 0.5;
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const expected = 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);

        expect(easeOutBack(x)).toBeCloseTo(expected, 5);
        expect(easeOutBack(x)).toBeCloseTo(1.0876975, 5); // Hardcoded calculated value
    });

    it('exceeds 1 slightly before settling at 1 (bounce back effect)', () => {
        // Find a point where it overshoots 1
        // Usually easeOutBack overshoots near the end, e.g. x = 0.8
        const x = 0.8;
        expect(easeOutBack(x)).toBeGreaterThan(1);
    });
});
