const { buildGrid, forNearby, CELL } = require('../game');

describe('buildGrid', () => {
  test('places entities in correct cells based on positive coordinates', () => {
    const ents = [
      { id: 1, x: 10, y: 10 },
      { id: 2, x: CELL + 10, y: CELL + 10 },
      { id: 3, x: 50, y: 50 },
      { id: 4, x: CELL * 2, y: 0 }
    ];

    const grid = buildGrid(ents);

    expect(grid.size).toBe(3);

    // Cell 0,0
    expect(grid.get('0,0')).toHaveLength(2);
    expect(grid.get('0,0')).toContainEqual(ents[0]);
    expect(grid.get('0,0')).toContainEqual(ents[2]);

    // Cell 1,1
    expect(grid.get('1,1')).toHaveLength(1);
    expect(grid.get('1,1')).toContainEqual(ents[1]);

    // Cell 2,0
    expect(grid.get('2,0')).toHaveLength(1);
    expect(grid.get('2,0')).toContainEqual(ents[3]);
  });

  test('handles negative coordinates correctly', () => {
    const ents = [
      { id: 1, x: -10, y: -10 },
      { id: 2, x: -CELL - 10, y: -CELL - 10 }
    ];

    const grid = buildGrid(ents);

    // -10 / 96 = -0.104 -> Math.floor(-0.104) = -1
    expect(grid.get('-1,-1')).toHaveLength(1);
    expect(grid.get('-1,-1')).toContainEqual(ents[0]);

    // -106 / 96 = -1.104 -> Math.floor(-1.104) = -2
    expect(grid.get('-2,-2')).toHaveLength(1);
    expect(grid.get('-2,-2')).toContainEqual(ents[1]);
  });

  test('returns an empty map for an empty array', () => {
    const grid = buildGrid([]);
    expect(grid).toBeInstanceOf(Map);
    expect(grid.size).toBe(0);
  });
});

describe('forNearby', () => {
  let ents;
  let grid;

  beforeEach(() => {
    ents = [
      { id: 'center', x: CELL / 2, y: CELL / 2 },                 // 0,0
      { id: 'top-left', x: -CELL / 2, y: -CELL / 2 },             // -1,-1
      { id: 'top', x: CELL / 2, y: -CELL / 2 },                   // 0,-1
      { id: 'top-right', x: CELL + CELL / 2, y: -CELL / 2 },      // 1,-1
      { id: 'left', x: -CELL / 2, y: CELL / 2 },                  // -1,0
      { id: 'right', x: CELL + CELL / 2, y: CELL / 2 },           // 1,0
      { id: 'bottom-left', x: -CELL / 2, y: CELL + CELL / 2 },    // -1,1
      { id: 'bottom', x: CELL / 2, y: CELL + CELL / 2 },          // 0,1
      { id: 'bottom-right', x: CELL + CELL / 2, y: CELL + CELL / 2 }, // 1,1
      { id: 'far-right', x: CELL * 2 + CELL / 2, y: CELL / 2 },   // 2,0
      { id: 'far-bottom', x: CELL / 2, y: CELL * 2 + CELL / 2 }   // 0,2
    ];
    grid = buildGrid(ents);
  });

  test('iterates over all entities in 3x3 surrounding cells', () => {
    const found = [];
    forNearby(grid, CELL / 2, CELL / 2, (e) => {
      found.push(e.id);
    });

    expect(found.length).toBe(9);
    // Should contain all items except far-right and far-bottom
    expect(found).toContain('center');
    expect(found).toContain('top-left');
    expect(found).toContain('top');
    expect(found).toContain('top-right');
    expect(found).toContain('left');
    expect(found).toContain('right');
    expect(found).toContain('bottom-left');
    expect(found).toContain('bottom');
    expect(found).toContain('bottom-right');
    expect(found).not.toContain('far-right');
    expect(found).not.toContain('far-bottom');
  });

  test('handles empty grid without errors', () => {
    const emptyGrid = buildGrid([]);
    const found = [];
    forNearby(emptyGrid, 0, 0, (e) => {
      found.push(e);
    });
    expect(found.length).toBe(0);
  });

  test('does not iterate if query is completely out of bounds', () => {
    const found = [];
    // Query near far-right, it should only find far-right
    forNearby(grid, CELL * 2 + CELL / 2, CELL / 2, (e) => {
      found.push(e.id);
    });

    expect(found).toContain('far-right');
    expect(found).toContain('right'); // 'right' is at 1,0, querying from 2,0 means 1,0 is included
    expect(found).toContain('top-right'); // 1,-1 is included in neighborhood of 2,0?
    // 2,0 neighborhood: x from 1 to 3, y from -1 to 1.
    // top-right is 1,-1 so it's included.

    // Let's query really far away
    const foundFar = [];
    forNearby(grid, CELL * 10, CELL * 10, (e) => {
      foundFar.push(e.id);
    });

    expect(foundFar.length).toBe(0);
  });
});
