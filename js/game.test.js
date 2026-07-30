// Mock global variables before requiring game.js
global.document = {
  getElementById: jest.fn().mockReturnValue({
    getContext: jest.fn().mockReturnValue({})
  })
};
global.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener: jest.fn(),
  AudioContext: jest.fn()
};
global.loadMeta = jest.fn();
global.Input = { wantWalk: false };
global.loadLeaderboard = jest.fn();

const { compact, compactByLife } = require('./game.js');

describe('compact functions', () => {
  describe('compact', () => {
    it('should remove elements where the specified key is true', () => {
      let arr = [{ id: 1, dead: false }, { id: 2, dead: true }, { id: 3, dead: false }];
      compact(arr, 'dead');
      expect(arr).toEqual([{ id: 1, dead: false }, { id: 3, dead: false }]);
    });

    it('should do nothing if no elements match the condition', () => {
      let arr = [{ id: 1, dead: false }, { id: 2, dead: false }];
      compact(arr, 'dead');
      expect(arr).toEqual([{ id: 1, dead: false }, { id: 2, dead: false }]);
    });

    it('should handle empty arrays', () => {
      let arr = [];
      compact(arr, 'dead');
      expect(arr).toEqual([]);
    });

    it('should remove all elements if all match the condition', () => {
      let arr = [{ id: 1, dead: true }, { id: 2, dead: true }];
      compact(arr, 'dead');
      expect(arr).toEqual([]);
    });
  });

  describe('compactByLife', () => {
    it('should remove elements where life <= 0', () => {
      let arr = [{ id: 1, life: 10 }, { id: 2, life: 0 }, { id: 3, life: -5 }, { id: 4, life: 2 }];
      compactByLife(arr);
      expect(arr).toEqual([{ id: 1, life: 10 }, { id: 4, life: 2 }]);
    });

    it('should do nothing if all elements have life > 0', () => {
      let arr = [{ id: 1, life: 10 }, { id: 2, life: 5 }];
      compactByLife(arr);
      expect(arr).toEqual([{ id: 1, life: 10 }, { id: 2, life: 5 }]);
    });

    it('should handle empty arrays', () => {
      let arr = [];
      compactByLife(arr);
      expect(arr).toEqual([]);
    });

    it('should remove all elements if none have life > 0', () => {
      let arr = [{ id: 1, life: 0 }, { id: 2, life: -1 }];
      compactByLife(arr);
      expect(arr).toEqual([]);
    });
  });
});
