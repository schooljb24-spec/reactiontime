"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TOTAL_ROUNDS = 5;

const SCREENS = {
  LEADERBOARD: "leaderboard",
  NAME_ENTRY: "name_entry",
  WAITING: "waiting",
  READY: "ready",
  RESULT: "result",
  SUMMARY: "summary",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatTime(ms) {
  return `${ms}ms`;
}

function getRating(avg) {
  if (avg < 180) return { label: "SUPERHUMAN", color: "#00FFB3" };
  if (avg < 220) return { label: "ELITE", color: "#00D4FF" };
  if (avg < 270) return { label: "SHARP", color: "#A3FF00" };
  if (avg < 320) return { label: "AVERAGE", color: "#FFD700" };
  if (avg < 400) return { label: "SLOW", color: "#FF8C00" };
  return { label: "SLEEPY", color: "#FF4444" };
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LEADERBOARD);
  const [name, setName] = useState("");
  const [round, setRound] = useState(0);
  const [results, setResults] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [earlyClick, setEarlyClick] = useState(false);
  const [isGreen, setIsGreen] = useState(false);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const loadedRef = useRef(false);

  // Inject keyframe styles safely inside the browser only
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes blink {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.9); }
        40% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes pulse {
        0% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      * { box-sizing: border-box; }
      input::placeholder { color: #444; }
      input:focus { border-color: #FFD70066 !important; }
      button:active { transform: scale(0.97); }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // Load leaderboard from storage on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const stored = await window.storage?.get("reaction_leaderboard", true);
        if (stored && stored.value) {
          setLeaderboard(JSON.parse(stored.value));
        }
      } catch {
        // No data yet
      }
    })();
  }, []);

  const saveLeaderboard = useCallback(async (entries) => {
    try {
      await window.storage?.set(
        "reaction_leaderboard",
        JSON.stringify(entries),
        true
      );
    } catch (e) {
      console.error("Storage error", e);
    }
  }, []);

  const startRound = useCallback(async () => {
    setEarlyClick(false);
    setIsGreen(false);
    setCurrentResult(null);
    setScreen(SCREENS.WAITING);

    const delay = 2000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      setIsGreen(true);
      startTimeRef.current = Date.now();
      setScreen(SCREENS.READY);
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (screen === SCREENS.WAITING) {
      clearTimeout(timerRef.current);
      setEarlyClick(true);
      setScreen(SCREENS.RESULT);
      setCurrentResult(null);
    } else if (screen === SCREENS.READY) {
      const elapsed = Date.now() - startTimeRef.current;
      setCurrentResult(elapsed);
      setIsGreen(false);
      setScreen(SCREENS.RESULT);
    }
  }, [screen]);

  const handleNextRound = useCallback(() => {
    if (earlyClick) {
      startRound();
      return;
    }
    const newResults = [...results, currentResult];
    setResults(newResults);
    if (newResults.length >= TOTAL_ROUNDS) {
      setScreen(SCREENS.SUMMARY);
    } else {
      setRound((r) => r + 1);
      startRound();
    }
  }, [earlyClick, results, currentResult, startRound]);

  const handleSubmitScore = useCallback(async () => {
    const valid = results.filter(Boolean);
    const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    const entry = {
      name: name.trim(),
      avg,
      scores: valid,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
    };
    const newBoard = [...leaderboard, entry]
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 100);
    setLeaderboard(newBoard);
    await saveLeaderboard(newBoard);
    setScreen(SCREENS.LEADERBOARD);
    setResults([]);
    setRound(0);
    setName("");
  }, [results, name, leaderboard, saveLeaderboard]);

  const startGame = useCallback(() => {
    if (!name.trim()) return;
    setResults([]);
    setRound(0);
    startRound();
  }, [name, startRound]);

  // ─── SCREENS ────────────────────────────────────────────────────────────────

  if (screen === SCREENS.LEADERBOARD) {
    return (
      <div style={styles.root}>
        <div style={styles.noise} />
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.logo}>⚡</div>
            <h1 style={styles.title}>REFLEX</h1>
            <p style={styles.subtitle}>Global Reaction Time Leaderboard</p>
          </header>

          <button style={styles.primaryBtn} onClick={() => setScreen(SCREENS.NAME_ENTRY)}>
            TAKE THE TEST
          </button>

          <div style={styles.board}>
            {leaderboard.length === 0 ? (
              <div style={styles.empty}>
                <span style={styles.emptyIcon}>🏁</span>
                <p>No scores yet. Be the first!</p>
              </div>
            ) : (
              leaderboard.map((entry, i) => {
                const rating = getRating(entry.avg);
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.row,
                      ...(i === 0 ? styles.rowFirst : {}),
                    }}
                  >
                    <span style={styles.rank}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span style={styles.rowName}>{entry.name}</span>
                    <span style={{ ...styles.rowRating, color: rating.color }}>
                      {rating.label}
                    </span>
                    <span style={styles.rowAvg}>{formatTime(entry.avg)}</span>
                    <span style={styles.rowDate}>{entry.date}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === SCREENS.NAME_ENTRY) {
    return (
      <div style={styles.root}>
        <div style={styles.noise} />
        <div style={styles.container}>
          <button style={styles.backBtn} onClick={() => setScreen(SCREENS.LEADERBOARD)}>
            ← Back
          </button>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🎮</div>
            <h2 style={styles.cardTitle}>Enter Your Name</h2>
            <p style={styles.cardDesc}>
              You'll complete <strong style={{ color: "#00FFB3" }}>5 rounds</strong>. Click as fast as you can when the screen turns green.
            </p>
            <input
              style={styles.input}
              placeholder="Your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              maxLength={24}
              autoFocus
            />
            <button
              style={{
                ...styles.primaryBtn,
                opacity: name.trim() ? 1 : 0.4,
                cursor: name.trim() ? "pointer" : "not-allowed",
              }}
              onClick={startGame}
              disabled={!name.trim()}
            >
              START →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === SCREENS.WAITING || screen === SCREENS.READY) {
    return (
      <div
        style={{
          ...styles.root,
          background: isGreen
            ? "linear-gradient(135deg, #003d20 0%, #00a844 100%)"
            : "linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 100%)",
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.1s",
        }}
        onClick={handleClick}
      >
        <div style={styles.noise} />
        <div style={styles.tapZone}>
          <div style={styles.roundBadge}>
            Round {round + 1} / {TOTAL_ROUNDS}
          </div>
          {isGreen ? (
            <>
              <div style={styles.goText}>CLICK!</div>
              <p style={styles.tapHint}>NOW!</p>
            </>
          ) : (
            <>
              <div style={styles.waitDots}>
                <span style={{ ...styles.dot, animationDelay: "0s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
              </div>
              <p style={styles.tapHint}>Wait for green...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === SCREENS.RESULT) {
    const isLast = results.length + 1 >= TOTAL_ROUNDS && !earlyClick;
    return (
      <div style={styles.root}>
        <div style={styles.noise} />
        <div style={styles.container}>
          <div style={styles.card}>
            {earlyClick ? (
              <>
                <div style={{ fontSize: 56 }}>⚠️</div>
                <h2 style={{ ...styles.cardTitle, color: "#FF4444" }}>
                  Too Early!
                </h2>
                <p style={styles.cardDesc}>
                  You clicked before the screen turned green. This round won't count.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 56 }}>⚡</div>
                <h2 style={styles.cardTitle}>Round {round + 1}</h2>
                <div style={styles.bigTime}>{formatTime(currentResult)}</div>
                <div style={{ ...styles.ratingBadge, backgroundColor: getRating(currentResult).color + "22", color: getRating(currentResult).color }}>
                  {getRating(currentResult).label}
                </div>
                <div style={styles.miniScores}>
                  {results.map((r, i) => (
                    <span key={i} style={styles.miniScore}>{formatTime(r)}</span>
                  ))}
                  <span style={{ ...styles.miniScore, background: "#00FFB322", color: "#00FFB3" }}>
                    {formatTime(currentResult)}
                  </span>
                </div>
              </>
            )}
            <button style={styles.primaryBtn} onClick={handleNextRound}>
              {isLast ? "SEE RESULTS →" : earlyClick ? "TRY AGAIN →" : `ROUND ${round + 2} →`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === SCREENS.SUMMARY) {
    const valid = results.filter(Boolean);
    const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    const best = Math.min(...valid);
    const worst = Math.max(...valid);
    const rating = getRating(avg);
    return (
      <div style={styles.root}>
        <div style={styles.noise} />
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🏆</div>
            <h2 style={styles.cardTitle}>{name}'s Results</h2>
            <div style={{ ...styles.bigTime, color: rating.color }}>{formatTime(avg)}</div>
            <div style={{ ...styles.ratingBadge, backgroundColor: rating.color + "22", color: rating.color, fontSize: 18, padding: "8px 24px" }}>
              {rating.label}
            </div>
            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Best</span>
                <span style={{ ...styles.statValue, color: "#00FFB3" }}>{formatTime(best)}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Avg</span>
                <span style={{ ...styles.statValue, color: rating.color }}>{formatTime(avg)}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Worst</span>
                <span style={{ ...styles.statValue, color: "#FF6B6B" }}>{formatTime(worst)}</span>
              </div>
            </div>
            <div style={styles.allScores}>
              {valid.map((r, i) => (
                <div key={i} style={styles.scoreBar}>
                  <span style={styles.scoreBarLabel}>Round {i + 1}</span>
                  <div style={styles.scoreBarTrack}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${Math.min(100, (r / 600) * 100)}%`,
                        background: getRating(r).color,
                      }}
                    />
                  </div>
                  <span style={styles.scoreBarVal}>{formatTime(r)}</span>
                </div>
              ))}
            </div>
            <button style={styles.primaryBtn} onClick={handleSubmitScore}>
              SAVE TO LEADERBOARD →
            </button>
            <button
              style={styles.ghostBtn}
              onClick={() => {
                setResults([]);
                setRound(0);
                startRound();
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)",
    fontFamily: "'Courier New', 'Consolas', monospace",
    color: "#e8e8f0",
    position: "relative",
    overflow: "hidden",
  },
  noise: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 640,
    margin: "0 auto",
    padding: "24px 16px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
  },
  header: {
    textAlign: "center",
    paddingTop: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
    filter: "drop-shadow(0 0 16px #FFD70088)",
  },
  title: {
    fontSize: "clamp(48px, 10vw, 72px)",
    fontWeight: 900,
    letterSpacing: "0.3em",
    margin: 0,
    background: "linear-gradient(135deg, #FFD700, #FF8C00, #FFD700)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "none",
    lineHeight: 1,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: "0.25em",
    color: "#888",
    marginTop: 8,
    textTransform: "uppercase",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #FFD700, #FF8C00)",
    border: "none",
    borderRadius: 4,
    padding: "16px 40px",
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: "0.2em",
    color: "#0d0d1a",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
    maxWidth: 320,
    transition: "transform 0.1s, opacity 0.2s",
  },
  ghostBtn: {
    background: "transparent",
    border: "1px solid #444",
    borderRadius: 4,
    padding: "12px 32px",
    fontSize: 12,
    letterSpacing: "0.15em",
    color: "#888",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
    maxWidth: 320,
    marginTop: -8,
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 13,
    letterSpacing: "0.1em",
    fontFamily: "inherit",
    alignSelf: "flex-start",
    padding: "4px 0",
  },
  board: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginTop: 8,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "#ffffff08",
    borderRadius: 4,
    fontSize: 13,
    borderLeft: "2px solid transparent",
  },
  rowFirst: {
    background: "#FFD70010",
    borderLeft: "2px solid #FFD700",
  },
  rank: {
    width: 36,
    textAlign: "center",
    fontSize: 16,
    flexShrink: 0,
  },
  rowName: {
    flex: 1,
    fontWeight: 700,
    letterSpacing: "0.05em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowRating: {
    fontSize: 10,
    letterSpacing: "0.15em",
    fontWeight: 900,
    flexShrink: 0,
  },
  rowAvg: {
    color: "#e8e8f0",
    fontWeight: 700,
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  rowDate: {
    color: "#555",
    fontSize: 11,
    flexShrink: 0,
  },
  empty: {
    textAlign: "center",
    padding: "48px 0",
    color: "#555",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: { fontSize: 40 },
  card: {
    background: "#ffffff06",
    border: "1px solid #ffffff10",
    borderRadius: 8,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    backdropFilter: "blur(10px)",
  },
  cardIcon: { fontSize: 48 },
  cardTitle: {
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: "0.1em",
    margin: 0,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 1.7,
    margin: 0,
    letterSpacing: "0.03em",
  },
  input: {
    width: "100%",
    background: "#ffffff0a",
    border: "1px solid #ffffff20",
    borderRadius: 4,
    padding: "14px 16px",
    fontSize: 16,
    color: "#e8e8f0",
    fontFamily: "inherit",
    letterSpacing: "0.1em",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
  },
  tapZone: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: 24,
    padding: 32,
    width: "100%",
  },
  roundBadge: {
    position: "absolute",
    top: 32,
    right: 32,
    fontSize: 11,
    letterSpacing: "0.2em",
    color: "#ffffff66",
    background: "#ffffff10",
    padding: "6px 14px",
    borderRadius: 20,
  },
  goText: {
    fontSize: "clamp(72px, 20vw, 128px)",
    fontWeight: 900,
    letterSpacing: "0.15em",
    color: "#ffffff",
    textShadow: "0 0 60px #00FF8888",
    lineHeight: 1,
    animation: "pulse 0.3s ease-out",
  },
  waitDots: {
    display: "flex",
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#ffffff33",
    display: "inline-block",
    animation: "blink 1.2s infinite ease-in-out",
  },
  tapHint: {
    fontSize: 13,
    letterSpacing: "0.2em",
    color: "#ffffff55",
    margin: 0,
  },
  bigTime: {
    fontSize: "clamp(48px, 12vw, 72px)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    color: "#ffffff",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  ratingBadge: {
    fontSize: 12,
    letterSpacing: "0.25em",
    fontWeight: 900,
    padding: "6px 16px",
    borderRadius: 20,
  },
  miniScores: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  miniScore: {
    background: "#ffffff10",
    padding: "4px 12px",
    borderRadius: 3,
    fontSize: 12,
    color: "#888",
    fontVariantNumeric: "tabular-nums",
  },
  statsRow: {
    display: "flex",
    gap: 24,
    width: "100%",
    justifyContent: "center",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "#666",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 22,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
  },
  allScores: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  scoreBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
  },
  scoreBarLabel: {
    width: 52,
    color: "#666",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    background: "#ffffff10",
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.6s ease",
  },
  scoreBarVal: {
    width: 52,
    textAlign: "right",
    color: "#aaa",
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
  },
};
