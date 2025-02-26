import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Snake will move towards the direction of the key that's pressed
 * Snake will hit the wall and that will end the game
 * Snake can eat the food and grow
 * Snake will grow in the direction it's moving
 * Snake will die if it hits itself
 * Snake will grow when it eats the food
 * Snake will die if it hits the wall
 * Snake will grow when it eats the food (in what direction?)
 */

enum Direction {
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4,
}

const ReverseDirection = {
  [Direction.Up]: Direction.Down,
  [Direction.Right]: Direction.Left,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
};

type Cell = [number, number];

interface Snake {
  cells: Cell[];
  direction: Direction;
}

const GRID_CELL_COUNT = 20;
const GAME_BASE_SPEED = 500;

function getNextCells(cells: Cell[], direction: Direction) {
  const cellsWithoutFirstOne = cells.slice(1);
  const newCell = getCellTowardsDirection(cells, direction);
  cellsWithoutFirstOne.push(newCell);

  return cellsWithoutFirstOne;
}

function isHeadOfSnakeHittingWall(cells: Cell[], gridSize: number) {
  const lastCell = cells[cells.length - 1];
  return (
    lastCell[0] < 0 ||
    lastCell[0] >= gridSize ||
    lastCell[1] < 0 ||
    lastCell[1] >= gridSize
  );
}

function isSnakeEatingFood(cells: Cell[], food: Cell) {
  return cells.some((cell) => cell[0] === food[0] && cell[1] === food[1]);
}

// head of snake hittin any OTHER cell of the snake
function isHeadOfSnakeHittingItself(cells: Cell[]) {
  const lastCell = cells[cells.length - 1];
  return cells.some(
    (cell, index) =>
      index < cells.length - 1 &&
      cell[0] === lastCell[0] &&
      cell[1] === lastCell[1]
  );
}

function getCellTowardsDirection(cells: Cell[], direction: Direction): Cell {
  const lastCell = cells[cells.length - 1];
  if (direction === Direction.Up) {
    return [lastCell[0] - 1, lastCell[1]];
  } else if (direction === Direction.Right) {
    return [lastCell[0], lastCell[1] + 1];
  } else if (direction === Direction.Down) {
    return [lastCell[0] + 1, lastCell[1]];
  } else if (direction === Direction.Left) {
    return [lastCell[0], lastCell[1] - 1];
  }

  throw new Error("Invalid direction");
}

function getRandomCell(excludeCells: Cell[], totalCellCount: number) {
  let randomCell = [
    Math.floor(Math.random() * totalCellCount),
    Math.floor(Math.random() * totalCellCount),
  ];
  while (
    excludeCells.some(
      (cell) => cell[0] === randomCell[0] && cell[1] === randomCell[1]
    )
  ) {
    randomCell = [
      Math.floor(Math.random() * totalCellCount),
      Math.floor(Math.random() * totalCellCount),
    ];
  }
  return randomCell as Cell;
}

function SnakeGame({
  onFail,
}: {
  onFail: (stats: { points: number; seconds: number }) => void;
}) {
  const moveTimerRef = useRef<number>(null!);
  const secondsTimerRef = useRef<number>(null!);
  const [gameState, setGameState] = useState({
    speed: 1,
    gameOver: false,
    seconds: 0,
    points: 0,
  });
  const [snake, setSnake] = useState<Snake>({
    cells: [
      [0, 0],
      [0, 1],
    ],
    direction: Direction.Right,
  });

  const [food, setFood] = useState<Cell | null>(
    getRandomCell(snake.cells, GRID_CELL_COUNT)
  );

  const moveSnake = useCallback(
    (direction: Direction) => {
      if (direction === ReverseDirection[snake.direction]) {
        return;
      }

      const nextCells = getNextCells(snake.cells, direction);
      const originalTail = snake.cells[0];

      if (
        isHeadOfSnakeHittingWall(nextCells, GRID_CELL_COUNT) ||
        isHeadOfSnakeHittingItself(nextCells)
      ) {
        setGameState((prev) => ({
          ...prev,
          gameOver: true,
        }));
        onFail({
          points: gameState.points,
          seconds: gameState.seconds,
        });
        clearInterval(secondsTimerRef.current);
        clearInterval(moveTimerRef.current);
        return;
      }

      if (isSnakeEatingFood(nextCells, food!)) {
        // Grow the snake by 1 cell
        nextCells.unshift(originalTail);
        // Generate new food
        setFood(getRandomCell(nextCells, GRID_CELL_COUNT));
        // Slowly increase the speed
        setGameState((prev) => ({
          ...prev,
          speed: prev.speed * 1.1,
          points: prev.points + 1,
        }));
        try {
          window.navigator.vibrate(200);
        } catch {
          console.log("Vibration not supported");
        }
      }

      setSnake((prev) => {
        return {
          ...prev,
          cells: nextCells,
          direction,
        };
      });
    },
    [food, snake.cells, snake.direction]
  );

  // move the snake towards the direction of the key that's pressed
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState.gameOver) return;

      const keys = [
        ["ArrowUp", Direction.Up],
        ["ArrowDown", Direction.Down],
        ["ArrowRight", Direction.Right],
        ["ArrowLeft", Direction.Left],
      ] as const;

      for (const [keyName, keyDirection] of keys) {
        if (event.key === keyName) {
          clearInterval(moveTimerRef.current);
          moveSnake(keyDirection);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [moveSnake, gameState.gameOver]);

  // Snake continues to move in the direction it's moving in an interval depending on the speed
  useEffect(() => {
    if (gameState.gameOver) return;

    const interval = setInterval(() => {
      moveSnake(snake.direction);
    }, GAME_BASE_SPEED / gameState.speed);
    moveTimerRef.current = interval;

    return () => clearInterval(interval);
  }, [moveSnake, gameState, snake.direction]);

  // Game time
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        seconds: prev.seconds + 1,
      }));
    }, 1000);
    secondsTimerRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  // Maxed at 500px
  const wholeGridSize =
    Math.min(Math.min(window.innerWidth, window.innerHeight), 500) * 0.96; // 2% padding on 4 sides
  const cellSizePx = wholeGridSize / GRID_CELL_COUNT;

  const highScore = useMemo(() => {
    const existingStats = getExistingStats();
    return Math.max(...existingStats.map((stat) => stat.points));
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        placeContent: "center",
      }}
    >
      {/* Stats */}
      <p style={{ color: "orange" }}>High Score: {highScore}</p>
      <div
        className="stats"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: "1.25rem" }}>Points: {gameState.points}</p>
        <p>Time: {gameState.seconds}</p>
      </div>
      <div
        style={{
          width: wholeGridSize,
          height: wholeGridSize,
          // backgroundColor: "#ddd",
          position: "relative",
        }}
      >
        {/* Grid */}
        <div
          className="grid"
          style={{ position: "relative", border: "1px solid #ddd" }}
        >
          {Array.from({ length: GRID_CELL_COUNT }).map((_, i) => (
            <div key={i} style={{ display: "flex" }}>
              {Array.from({ length: GRID_CELL_COUNT }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    width: cellSizePx,
                    height: cellSizePx,
                    // border: "1px solid #eee",
                  }}
                ></div>
              ))}
            </div>
          ))}
        </div>
        {/* Snake */}
        <div className="snake">
          {snake.cells.map((cell, index) => {
            const isHead = index === snake.cells.length - 1;
            return (
              <div
                key={cell[0] + "," + cell[1]}
                style={{
                  width: cellSizePx,
                  height: cellSizePx,
                  backgroundColor: isHead ? "transparent" : "red",
                  position: "absolute",
                  top: cell[0] * cellSizePx,
                  left: cell[1] * cellSizePx,
                  ...(isHead && {
                    ...(snake.direction === Direction.Right && {
                      borderTop: `${cellSizePx / 2}px solid transparent`,
                      borderBottom: `${cellSizePx / 2}px solid transparent`,
                      borderLeft: `${cellSizePx}px solid red`,
                    }),
                    ...(snake.direction === Direction.Left && {
                      borderTop: `${cellSizePx / 2}px solid transparent`,
                      borderBottom: `${cellSizePx / 2}px solid transparent`,
                      borderRight: `${cellSizePx}px solid red`,
                    }),
                    ...(snake.direction === Direction.Up && {
                      borderLeft: `${cellSizePx / 2}px solid transparent`,
                      borderRight: `${cellSizePx / 2}px solid transparent`,
                      borderBottom: `${cellSizePx}px solid red`,
                    }),
                    ...(snake.direction === Direction.Down && {
                      borderLeft: `${cellSizePx / 2}px solid transparent`,
                      borderRight: `${cellSizePx / 2}px solid transparent`,
                      borderTop: `${cellSizePx}px solid red`,
                    }),
                  }),
                }}
              ></div>
            );
          })}
        </div>

        {/* Food */}
        {food && (
          <div className="food">
            <div
              style={{
                width: cellSizePx,
                height: cellSizePx,
                backgroundColor: "blue",
                position: "absolute",
                top: food[0] * cellSizePx,
                left: food[1] * cellSizePx,
                animation: "blinking 0.5s infinite",
              }}
            ></div>
          </div>
        )}
      </div>
      <div
        className="controls"
        style={{
          height: 100,
          position: "absolute",
          left: 5,
          right: 5,
          bottom: 5,
        }}
      >
        <button
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "50%",
            height: 30,
          }}
          onClick={() => moveSnake(Direction.Up)}
        >
          Up
        </button>
        <button
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "50%",
            height: 30,
          }}
          onClick={() => moveSnake(Direction.Down)}
        >
          Down
        </button>
        <button
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            right: 0,
            width: "48%",
            height: 30,
          }}
          onClick={() => moveSnake(Direction.Right)}
        >
          Right
        </button>
        <button
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: 0,
            width: "48%",
            height: 30,
          }}
          onClick={() => moveSnake(Direction.Left)}
        >
          Left
        </button>
      </div>
    </div>
  );
}

function getExistingStats() {
  const existingStats = localStorage.getItem("snake.stats");
  return (existingStats ? JSON.parse(existingStats) : []) as Array<{
    points: number;
    seconds: number;
  }>;
}

function App() {
  const [gameState, setGameState] = useState({
    gameOver: false,
    key: 1,
    isNewHighScore: false,
  });

  const updateStats = useCallback((points: number, seconds: number) => {
    const existingStats = getExistingStats();
    existingStats.push({
      points,
      seconds,
    });
    localStorage.setItem("snake.stats", JSON.stringify(existingStats));
  }, []);

  return (
    <>
      <SnakeGame
        onFail={(stats) => {
          let isNewHighScore = false;
          const existingStats = getExistingStats();
          const existingHighScore = Math.max(
            ...existingStats.map((stat) => stat.points)
          );
          if (existingHighScore < stats.points) {
            isNewHighScore = true;
          }
          setGameState({
            gameOver: true,
            key: gameState.key,
            isNewHighScore,
          });
          updateStats(stats.points, stats.seconds);
        }}
        key={gameState.key}
      />
      {/* Game over overlay */}
      {gameState.gameOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#eee",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            zIndex: 2,
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {gameState.isNewHighScore ? (
            <p style={{ color: "green" }}>New High Score!</p>
          ) : (
            <p>Game Over :(</p>
          )}
          <button
            onClick={() => {
              setGameState({
                gameOver: false,
                key: gameState.key + 1,
                isNewHighScore: false,
              });
            }}
          >
            Restart
          </button>
        </div>
      )}
    </>
  );
}

export default App;
