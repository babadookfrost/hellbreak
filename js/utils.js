// PRNG function (Mulberry32)
function splitmix32(a) {
    return function() {
      a |= 0; a = a + 0x9e3779b9 | 0;
      var t = a ^ a >>> 16;
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ t >>> 15;
      t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
    }
}

const RNG = {
    seed: 0,
    random: Math.random, // Default to standard random

    setSeed: function(seedStr) {
        if (!seedStr) {
            this.random = Math.random;
            return;
        }
        let h = 1779033703 ^ seedStr.length;
        for(let i = 0; i < seedStr.length; i++) {
            h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
            h = h << 13 | h >>> 19;
        }
        this.seed = (function() {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return (h ^= h >>> 16) >>> 0;
        })();

        this.random = splitmix32(this.seed);
    },

    // Helper functions replacing common GameRNG.random() patterns
    randRange: function(min, max) {
        return this.random() * (max - min) + min;
    },

    randInt: function(min, max) {
        return Math.floor(this.random() * (max - min)) + min;
    }
};

window.GameRNG = RNG; // Expose to global scope
