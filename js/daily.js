// daily.js

function getDailySeed() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const DailyMode = {
    active: false,
    seed: null,

    start: function(Game) {
        this.active = true;
        this.seed = getDailySeed();
        GameRNG.setSeed(this.seed);

        // Backup meta state
        this.savedMeta = JSON.parse(JSON.stringify(metaState));

        // Reset meta to base for Daily Run
        metaState.hpLvl = 0;
        metaState.dmgLvl = 0;
        metaState.extraSlot = 0;
        metaState.startItem = 0;

        Game.start();
        Game.isDaily = true;

        // Re-calculate stats since meta state changed
        Game.stats = Game.recalcStats();
    },

    end: function() {
        if (!this.active) return;
        this.active = false;

        // Restore meta state
        metaState = this.savedMeta;
        saveMeta(); // Make sure it's saved

        // Clear saved meta so we don't accidentally think we are still in Daily mode in UI
        this.savedMeta = null;

        // Reset RNG
        GameRNG.setSeed(null);
    },

    saveScore: function(score, wave, level) {
        if (!this.active) return;

        const date = getDailySeed();
        const scores = JSON.parse(localStorage.getItem('dailyScores_' + date) || '[]');

        scores.push({
            score: score,
            wave: wave,
            level: level,
            name: "Вы" // Could prompt for name if needed
        });

        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem('dailyScores_' + date, JSON.stringify(scores.slice(0, 10)));
    },

    getBestScore: function() {
        const date = getDailySeed();
        const scores = JSON.parse(localStorage.getItem('dailyScores_' + date) || '[]');
        return scores.length > 0 ? scores[0].score : 0;
    }
};

window.DailyMode = DailyMode;
