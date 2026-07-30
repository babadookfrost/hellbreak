// Mock global variables for Node.js environment
global.document = {
    getElementById: (id) => ({
        getContext: () => ({}),
        style: {}
    }),
    addEventListener: () => {}
};
global.window = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    onload: () => {}
};
global.navigator = { userAgent: 'node' };
global.loadMeta = () => {};
global.loadLeaderboard = () => [];
global.Input = { wantWalk: false };
global.AudioContext = class {};

const { compactByLife } = require('./game.js');

describe('compactByLife', () => {
    it('removes elements with life <= 0', () => {
        const arr = [
            { id: 1, life: 10 },
            { id: 2, life: 0 },
            { id: 3, life: -5 },
            { id: 4, life: 20 }
        ];
        compactByLife(arr);
        expect(arr).toEqual([
            { id: 1, life: 10 },
            { id: 4, life: 20 }
        ]);
    });

    it('handles an empty array', () => {
        const arr = [];
        compactByLife(arr);
        expect(arr).toEqual([]);
    });

    it('keeps all elements if all have life > 0', () => {
        const arr = [
            { id: 1, life: 10 },
            { id: 2, life: 5 }
        ];
        compactByLife(arr);
        expect(arr).toEqual([
            { id: 1, life: 10 },
            { id: 2, life: 5 }
        ]);
    });

    it('removes all elements if all have life <= 0', () => {
        const arr = [
            { id: 1, life: 0 },
            { id: 2, life: -10 }
        ];
        compactByLife(arr);
        expect(arr).toEqual([]);
    });
});
