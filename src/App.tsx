import { useCallback, useEffect, useState } from "react";

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

interface Snake {
  cells: [number, number][];
  direction: Direction;
}

const GRID_SIZE = 20;
const CELL_SIZE = 40;
const GAME_BASE_SPEED = 500;

function getNextCells(cells: [number, number][], direction: Direction) {
  const cellsWithoutFirstOne = cells.slice(1);
  const newCell = getCellTowardsDirection(cells, direction);
  cellsWithoutFirstOne.push(newCell);

  return cellsWithoutFirstOne;
}

function isHeadOfSnakeHittingWall(cells: [number, number][], gridSize: number) {
  const lastCell = cells[cells.length - 1];
  return (
    lastCell[0] < 0 ||
    lastCell[0] >= gridSize ||
    lastCell[1] < 0 ||
    lastCell[1] >= gridSize
  );
}

function isSnakeEatingFood(cells: [number, number][], food: [number, number]) {
  return cells.some((cell) => cell[0] === food[0] && cell[1] === food[1]);
}

// head of snake hittin any OTHER cell of the snake
function isHeadOfSnakeHittingItself(cells: [number, number][]) {
  const lastCell = cells[cells.length - 1];
  return cells.some(
    (cell, index) =>
      index < cells.length - 1 &&
      cell[0] === lastCell[0] &&
      cell[1] === lastCell[1]
  );
}

function getCellTowardsDirection(
  cells: [number, number][],
  direction: Direction
): [number, number] {
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

function App() {
  const [gameState, setGameState] = useState({
    speed: 1,
    gameOver: false,
  });
  const [snake, setSnake] = useState<Snake>({
    cells: [
      [0, 0],
      [0, 1],
    ],
    direction: Direction.Right,
  });

  const [food, setFood] = useState<[number, number] | null>([
    Math.floor(Math.random() * GRID_SIZE),
    Math.floor(Math.random() * GRID_SIZE),
  ]);

  const moveSnake = useCallback(
    (direction: Direction) => {
      if (direction === ReverseDirection[snake.direction]) {
        return;
      }

      const nextCells = getNextCells(snake.cells, direction);
      const originalTail = snake.cells[0];

      if (
        isHeadOfSnakeHittingWall(nextCells, GRID_SIZE) ||
        isHeadOfSnakeHittingItself(nextCells)
      ) {
        setGameState((prev) => ({
          ...prev,
          gameOver: true,
        }));
        return;
      }

      if (isSnakeEatingFood(nextCells, food!)) {
        setFood([
          Math.floor(Math.random() * GRID_SIZE),
          Math.floor(Math.random() * GRID_SIZE),
        ]);
        // Grow the snake by 1 cell
        nextCells.unshift(originalTail);
        // Slowly increase the speed
        setGameState((prev) => ({
          ...prev,
          speed: prev.speed * 1.2,
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
          moveSnake(keyDirection);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [moveSnake, gameState.gameOver]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX = event.changedTouches[0].clientX;
      touchStartY = event.changedTouches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      touchEndX = event.changedTouches[0].clientX;
      touchEndY = event.changedTouches[0].clientY;
      handleSwipeGesture();
    };

    const handleSwipeGesture = () => {
      if (gameState.gameOver) return;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 50) {
          // Detect right swipe
          moveSnake(Direction.Right);
        } else if (deltaX < -50) {
          // Detect left swipe
          moveSnake(Direction.Left);
        }
      } else {
        // Vertical swipe
        if (deltaY > 50) {
          // Detect down swipe
          moveSnake(Direction.Down);
        } else if (deltaY < -50) {
          // Detect up swipe
          moveSnake(Direction.Up);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [moveSnake, gameState.gameOver]);

  // Snake continues to move in the direction it's moving in an interval depending on the speed
  useEffect(() => {
    if (gameState.gameOver) return;

    const interval = setInterval(() => {
      moveSnake(snake.direction);
    }, GAME_BASE_SPEED / gameState.speed);

    return () => clearInterval(interval);
  }, [moveSnake, gameState, snake.direction]);

  return (
    <div
      style={{
        width: GRID_SIZE * CELL_SIZE,
        height: GRID_SIZE * CELL_SIZE,
        backgroundColor: "#ddd",
        position: "relative",
      }}
    >
      {/* Game over overlay */}
      {gameState.gameOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            zIndex: 2,
          }}
        >
          <div>Game Over</div>
        </div>
      )}

      {/* Grid */}
      {Array.from({ length: GRID_SIZE }).map((_, i) => (
        <div key={i} style={{ display: "flex" }}>
          {Array.from({ length: GRID_SIZE }).map((_, j) => (
            <div
              key={j}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                border: "1px solid #eee",
              }}
            ></div>
          ))}
        </div>
      ))}
      {/* Snake */}
      {snake.cells.map((cell) => (
        <div
          key={cell[0] + "," + cell[1]}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: "red",
            position: "absolute",
            top: cell[0] * CELL_SIZE,
            left: cell[1] * CELL_SIZE,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        ></div>
      ))}

      {/* Food */}
      {food && (
        <div
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: "blue",
            position: "absolute",
            top: food[0] * CELL_SIZE,
            left: food[1] * CELL_SIZE,
            borderRadius: 8,
            animation: "blinking 0.5s infinite",
          }}
        ></div>
      )}
    </div>
  );
}

export default App;
