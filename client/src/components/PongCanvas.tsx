import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

type Mode = 'single' | 'multi';
type Side = 'left' | 'right';

type PongCanvasProps = {
  mode: Mode;
  onGameFinished: (score: number) => void;
  isMobile?: boolean;
  mobileUp?: boolean;
  mobileDown?: boolean;
  setGameInProgress?: (inProgress: boolean) => void;
};

const width = 800;
const height = 500;
const paddleHeight = 90;
const paddleWidth = 12;
const ballSize = 12;
const winningScore = 7;
const paddleSpeed = 520;
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function PongCanvas({ mode, onGameFinished, isMobile, mobileUp, mobileDown, setGameInProgress }: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    // Remove local isMobile state, now passed as prop
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('Guest mode is live. Play instantly.');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [multiReady, setMultiReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [localY, setLocalY] = useState(height / 2 - paddleHeight / 2);
  const localYRef = useRef(localY);
  const remoteYRef = useRef(height / 2 - paddleHeight / 2);
  const movementKeysRef = useRef({ up: false, down: false });

  const isHostRef = useRef(false);
  const sideRef = useRef<Side>('left');

  const singleState = useRef({
    ballX: width / 2,
    ballY: height / 2,
    ballVX: 4,
    ballVY: 3,
    leftScore: 0,
    rightScore: 0,
    botY: height / 2 - paddleHeight / 2,
  });

  const multiplayerState = useRef({
    ballX: width / 2,
    ballY: height / 2,
    ballVX: 4,
    ballVY: 3,
    leftScore: 0,
    rightScore: 0,
  });

  const resetSingleMatch = () => {
    singleState.current = {
      ballX: width / 2,
      ballY: height / 2,
      ballVX: 4,
      ballVY: 3,
      leftScore: 0,
      rightScore: 0,
      botY: height / 2 - paddleHeight / 2,
    };
    localYRef.current = height / 2 - paddleHeight / 2;
    setLocalY(height / 2 - paddleHeight / 2);
  };

  const resetMultiMatch = () => {
    multiplayerState.current = {
      ballX: width / 2,
      ballY: height / 2,
      ballVX: 4,
      ballVY: 3,
      leftScore: 0,
      rightScore: 0,
    };
    localYRef.current = height / 2 - paddleHeight / 2;
    remoteYRef.current = height / 2 - paddleHeight / 2;
    setLocalY(height / 2 - paddleHeight / 2);
  };

  const handleStart = () => {
    if (mode === 'single') {
      resetSingleMatch();
      setStatus('Match started. Survive the bot.');
    } else {
      resetMultiMatch();
      setStatus('Match started. Fight for the first 7 points.');
    }
    setHasStarted(true);
    setGameInProgress?.(true);
  };

  useEffect(() => {
    // Keyboard controls (desktop)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        movementKeysRef.current.up = true;
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        movementKeysRef.current.down = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        movementKeysRef.current.up = false;
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        movementKeysRef.current.down = false;
      }
    };

    const onWindowBlur = () => {
      movementKeysRef.current.up = false;
      movementKeysRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, []);

  // Mobile controls (from App)
  useEffect(() => {
    if (isMobile) {
      movementKeysRef.current.up = !!mobileUp;
      movementKeysRef.current.down = !!mobileDown;
    }
  }, [isMobile, mobileUp, mobileDown]);

  useEffect(() => {
    if (mode !== 'multi') {
      socket?.disconnect();
      setSocket(null);
      setRoomId('');
      setJoinCode('');
      setMultiReady(false);
      setHasStarted(false);
      setStatus('Guest mode is live. Play instantly.');
      return;
    }

    const nextSocket = io(apiBase, { transports: ['websocket'] });

    nextSocket.on('connect', () => {
      setStatus('Connected. Create a room or join with code.');
    });

    nextSocket.on('startMatch', (payload: { roomId: string; side: Side; isHost: boolean }) => {
      setRoomId(payload.roomId);
      sideRef.current = payload.side;
      isHostRef.current = payload.isHost;
      setMultiReady(true);
      multiplayerState.current = {
        ballX: width / 2,
        ballY: height / 2,
        ballVX: 4,
        ballVY: 3,
        leftScore: 0,
        rightScore: 0,
      };
      setStatus(`Match started in room ${payload.roomId}. You are ${payload.side}.`);
      setHasStarted(false);
    });

    nextSocket.on('opponentReady', () => {
      setStatus('Opponent joined. Match is live.');
    });

    nextSocket.on('paddleMove', (payload: { side: Side; y: number }) => {
      const controlledSide = sideRef.current;
      if (payload.side !== controlledSide) {
        remoteYRef.current = Math.max(0, Math.min(height - paddleHeight, payload.y));
      }
    });

    nextSocket.on('ballSync', (payload: { x: number; y: number; vx: number; vy: number }) => {
      if (isHostRef.current) {
        return;
      }
      multiplayerState.current.ballX = payload.x;
      multiplayerState.current.ballY = payload.y;
      multiplayerState.current.ballVX = payload.vx;
      multiplayerState.current.ballVY = payload.vy;
    });

    nextSocket.on('scoreUpdate', (payload: { left: number; right: number }) => {
      multiplayerState.current.leftScore = payload.left;
      multiplayerState.current.rightScore = payload.right;
    });

    nextSocket.on('playerDisconnected', () => {
      setStatus('Opponent disconnected. Create or join a new room.');
      setMultiReady(false);
      setRoomId('');
      setHasStarted(false);
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'multi' || !socket || !roomId || !multiReady) {
      return;
    }

    if (!hasStarted) {
      return;
    }

    socket.emit('paddleMove', {
      roomId,
      side: sideRef.current,
      y: localY,
    });
  }, [localY, mode, socket, roomId, multiReady, hasStarted]);

  useEffect(() => {
    const backgroundImage = new Image();
    backgroundImage.src = '/bg.jpg';
    backgroundImageRef.current = backgroundImage;

    return () => {
      backgroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === canvasFrameRef.current);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let previousTime = performance.now();

    const updateLocalPaddle = (deltaSeconds: number) => {
      const keys = movementKeysRef.current;
      let direction = 0;

      if (keys.up) {
        direction -= 1;
      }

      if (keys.down) {
        direction += 1;
      }

      if (direction === 0) {
        return;
      }

      const nextY = Math.max(
        0,
        Math.min(height - paddleHeight, localYRef.current + direction * paddleSpeed * deltaSeconds)
      );

      if (nextY !== localYRef.current) {
        localYRef.current = nextY;
        setLocalY(nextY);
      }
    };

    const draw = (currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frame = requestAnimationFrame(draw);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        frame = requestAnimationFrame(draw);
        return;
      }

      const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.05);
      previousTime = currentTime;

      if (hasStarted) {
        updateLocalPaddle(deltaSeconds);
      }

      context.clearRect(0, 0, width, height);
      drawCanvasBackground(context, backgroundImageRef.current);

      for (let index = 0; index < height; index += 28) {
        context.fillStyle = '#2d3c59';
        context.fillRect(width / 2 - 2, index, 4, 18);
      }

      if (mode === 'single') {
        if (hasStarted) {
          runSingleFrame(context);
        } else {
          const game = singleState.current;
          drawPaddlesAndBall(
            context,
            localYRef.current,
            game.botY,
            game.ballX,
            game.ballY,
            game.leftScore,
            game.rightScore
          );
        }
      } else {
        if (hasStarted && multiReady) {
          runMultiFrame(context);
        } else {
          const game = multiplayerState.current;
          const localSide = sideRef.current;
          const leftY = localSide === 'left' ? localYRef.current : remoteYRef.current;
          const rightY = localSide === 'right' ? localYRef.current : remoteYRef.current;
          drawPaddlesAndBall(context, leftY, rightY, game.ballX, game.ballY, game.leftScore, game.rightScore);
        }
      }

      frame = requestAnimationFrame(draw);
    };

    const runSingleFrame = (context: CanvasRenderingContext2D) => {
      const game = singleState.current;

      game.botY += (game.ballY - (game.botY + paddleHeight / 2)) * 0.09;
      game.botY = Math.max(0, Math.min(height - paddleHeight, game.botY));

      game.ballX += game.ballVX;
      game.ballY += game.ballVY;

      if (game.ballY <= 0 || game.ballY >= height - ballSize) {
        game.ballVY *= -1;
      }

      const playerPaddleHit =
        game.ballX <= paddleWidth + 20 &&
        game.ballY + ballSize >= localYRef.current &&
        game.ballY <= localYRef.current + paddleHeight;

      const botPaddleHit =
        game.ballX + ballSize >= width - paddleWidth - 20 &&
        game.ballY + ballSize >= game.botY &&
        game.ballY <= game.botY + paddleHeight;

      if (playerPaddleHit || botPaddleHit) {
        game.ballVX *= -1;
      }

      if (game.ballX < -ballSize) {
        game.rightScore += 1;
        resetBall(game, -1);
      }

      if (game.ballX > width + ballSize) {
        game.leftScore += 1;
        resetBall(game, 1);
      }

      if (game.leftScore >= winningScore || game.rightScore >= winningScore) {
        onGameFinished(game.leftScore);
        game.leftScore = 0;
        game.rightScore = 0;
        resetBall(game, 1);
      }

      drawPaddlesAndBall(context, localYRef.current, game.botY, game.ballX, game.ballY, game.leftScore, game.rightScore);
    };

    const runMultiFrame = (context: CanvasRenderingContext2D) => {
      const game = multiplayerState.current;
      const localSide = sideRef.current;

      const leftY = localSide === 'left' ? localYRef.current : remoteYRef.current;
      const rightY = localSide === 'right' ? localYRef.current : remoteYRef.current;

      if (multiReady && isHostRef.current) {
        game.ballX += game.ballVX;
        game.ballY += game.ballVY;

        if (game.ballY <= 0 || game.ballY >= height - ballSize) {
          game.ballVY *= -1;
        }

        const leftHit =
          game.ballX <= paddleWidth + 20 &&
          game.ballY + ballSize >= leftY &&
          game.ballY <= leftY + paddleHeight;

        const rightHit =
          game.ballX + ballSize >= width - paddleWidth - 20 &&
          game.ballY + ballSize >= rightY &&
          game.ballY <= rightY + paddleHeight;

        if (leftHit || rightHit) {
          game.ballVX *= -1;
        }

        if (game.ballX < -ballSize) {
          game.rightScore += 1;
          resetBall(game, -1);
          socket?.emit('scoreUpdate', { roomId, left: game.leftScore, right: game.rightScore });
        }

        if (game.ballX > width + ballSize) {
          game.leftScore += 1;
          resetBall(game, 1);
          socket?.emit('scoreUpdate', { roomId, left: game.leftScore, right: game.rightScore });
        }

        if (roomId) {
          socket?.emit('ballSync', {
            roomId,
            x: game.ballX,
            y: game.ballY,
            vx: game.ballVX,
            vy: game.ballVY,
          });
        }
      }

      if (game.leftScore >= winningScore || game.rightScore >= winningScore) {
        const score = localSide === 'left' ? game.leftScore : game.rightScore;
        onGameFinished(score);
        game.leftScore = 0;
        game.rightScore = 0;
        resetBall(game, 1);
      }

      drawPaddlesAndBall(context, leftY, rightY, game.ballX, game.ballY, game.leftScore, game.rightScore);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [mode, onGameFinished, roomId, socket, multiReady, hasStarted]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await canvasFrameRef.current?.requestFullscreen();
        return;
      }

      if (document.fullscreenElement === canvasFrameRef.current) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen permission errors and continue the game.
    }
  };

  const roomActions = useMemo(
    () => ({
      createRoom: () => {
        if (!socket) {
          return;
        }
        socket.emit('createRoom', (payload: { roomId: string }) => {
          setRoomId(payload.roomId);
          setStatus(`Room ${payload.roomId} created. Share code and wait.`);
        });
      },
      joinRoom: () => {
        if (!socket || !joinCode.trim()) {
          return;
        }

        socket.emit('joinRoom', { roomId: joinCode.trim().toUpperCase() }, (response: { ok: boolean; message?: string }) => {
          if (!response.ok) {
            setStatus(response.message || 'Could not join room.');
            return;
          }
          setRoomId(joinCode.trim().toUpperCase());
          setStatus('Joined room. Waiting for host sync.');
        });
      },
    }),
    [socket, joinCode]
  );

  return (
    <section className="panel game-panel">
      <div className="row-between">
        <h2>{mode === 'single' ? 'Solo Pong vs Bot' : 'Multiplayer Pong'}</h2>
        {mode === 'multi' ? <span className="pill">Room: {roomId || 'none'}</span> : <span className="pill">Guest Ready</span>}
      </div>
      <p>{status}</p>
      <div className="canvas-frame" ref={canvasFrameRef}>
        <canvas
          className="pong-canvas"
          ref={canvasRef}
          width={width}
          height={height}
        />
        {!hasStarted ? (
          <div className="canvas-overlay">
            <h3>{mode === 'single' ? 'Solo Match' : 'Multiplayer Match'}</h3>
            <p>{mode === 'single' ? 'Press play to begin.' : (multiReady ? 'Opponent ready. Press play when you are ready.' : 'Create or join a room, then press play.')}</p>
            <button
              type="button"
              className="button"
              onClick={handleStart}
              disabled={mode === 'multi' && !multiReady}
            >
              Play
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="canvas-icon-btn"
          onClick={() => {
            toggleFullscreen().catch(() => {
              // Ignore fullscreen promise rejections from browser restrictions.
            });
          }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
        >
          {isFullscreen ? '🗗' : '⛶'}
        </button>
      </div>
      {mode === 'multi' ? (
        <div className="multiplayer-controls">
          <button className="button" type="button" onClick={roomActions.createRoom}>Create Room</button>
          <input
            placeholder="Join code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            maxLength={6}
          />
          <button className="button secondary" type="button" onClick={roomActions.joinRoom}>Join Room</button>
        </div>
      ) : null}
      <p className="hint">Controls: W/S or Arrow Up/Down</p>
    </section>
  );
}

// Mobile controls CSS now in App.css at app root
//   font-size: 2rem;
//   opacity: 0.92;
//   margin: 0 auto;
//   box-shadow: 0 2px 12px #000b;
//   user-select: none;
//   touch-action: none;
// }

function drawPaddlesAndBall(
  context: CanvasRenderingContext2D,
  leftY: number,
  rightY: number,
  ballX: number,
  ballY: number,
  leftScore: number,
  rightScore: number
): void {
  context.fillStyle = '#000000';
  context.fillRect(20, leftY, paddleWidth, paddleHeight);
  context.fillRect(width - paddleWidth - 20, rightY, paddleWidth, paddleHeight);

  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.lineWidth = 1.5;
  context.strokeRect(20, leftY, paddleWidth, paddleHeight);
  context.strokeRect(width - paddleWidth - 20, rightY, paddleWidth, paddleHeight);

  context.fillStyle = '#ff815e';
  context.fillRect(ballX, ballY, ballSize, ballSize);

  context.font = '700 28px "Space Grotesk", sans-serif';
  context.fillStyle = '#f2f6ff';
  context.fillText(String(leftScore), width / 2 - 48, 44);
  context.fillText(String(rightScore), width / 2 + 30, 44);
}

function drawCanvasBackground(
  context: CanvasRenderingContext2D,
  backgroundImage: HTMLImageElement | null
): void {
  if (!backgroundImage || !backgroundImage.complete || backgroundImage.naturalWidth === 0) {
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    return;
  }

  const imageAspect = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
  const canvasAspect = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > canvasAspect) {
    drawHeight = height;
    drawWidth = drawHeight * imageAspect;
    offsetX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = drawWidth / imageAspect;
    offsetY = (height - drawHeight) / 2;
  }

  context.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight);

  // Slight dark veil keeps the paddles, ball, and score readable.
  context.fillStyle = 'rgba(0, 0, 0, 0.35)';
  context.fillRect(0, 0, width, height);
}

function resetBall(game: { ballX: number; ballY: number; ballVX: number; ballVY: number }, horizontalDirection: 1 | -1): void {
  game.ballX = width / 2;
  game.ballY = height / 2;
  game.ballVX = 4 * horizontalDirection;
  game.ballVY = (Math.random() > 0.5 ? 1 : -1) * 3;
}
