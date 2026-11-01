import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

import {
  endSession,
  fetchDashboard,
  fetchProjectOverview,
  fetchSnapshot,
  startSession,
  updateEnvironment,
} from "./api";
import { ProjectOverviewPanel, fallbackProjectOverview } from "./ProjectOverview";
import { generateReportPdf } from "./report";

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function scoreColor(score) {
  if (score >= 80) return "var(--safe)";
  if (score >= 55) return "var(--susp)";
  return "var(--disq)";
}

function chartColor(score) {
  if (score >= 80) return "rgba(34, 200, 122, 0.72)";
  if (score >= 55) return "rgba(245, 166, 35, 0.72)";
  return "rgba(240, 79, 79, 0.72)";
}

function avatarBackground(score) {
  if (score >= 80) return "rgba(34, 200, 122, 0.12)";
  if (score >= 55) return "rgba(245, 166, 35, 0.12)";
  return "rgba(240, 79, 79, 0.12)";
}

function signalColor(score) {
  return scoreColor(score);
}

function normalizeEmotionEntries(snapshot) {
  if (!snapshot) return [];

  const rawEntries = [
    ["Confidence", snapshot.facial.confidence],
    ["Stress", snapshot.facial.stress],
    ["Nervousness", snapshot.facial.nervousness],
    ["Calmness", snapshot.signals.voiceCalmness],
  ];
  const total = rawEntries.reduce((sum, [, value]) => sum + value, 0) || 1;

  return rawEntries
    .map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 100),
    }))
    .sort((left, right) => right.value - left.value);
}

function environmentStatus(environment) {
  if (!environment) return "Scanning";
  if (environment.risk_label === "High Risk") return "High Risk";
  if (environment.risk_label === "Review") return "Review";
  return "Clear";
}

function deriveRiskLabel(personsDetected, phoneDetected) {
  if (personsDetected > 1) return "High Risk";
  if (phoneDetected) return "Review";
  return "Clear";
}

function verdictBannerClass(verdict) {
  if (!verdict) return "verdict-safe";
  if (verdict.cls === "disq") return "verdict-disq";
  if (verdict.cls === "susp") return "verdict-susp";
  return "verdict-safe";
}

function sessionChipClass(verdict) {
  if (!verdict) return "chip chip-safe";
  if (verdict.cls === "disq") return "chip chip-disq";
  if (verdict.cls === "susp") return "chip chip-susp";
  return "chip chip-safe";
}

function formatLabel(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLiveEnvironment(snapshot, liveDetection) {
  const fallback = snapshot?.environment;
  const personsDetected =
    liveDetection?.personsDetected ??
    fallback?.persons_detected ??
    1;
  const phoneDetected =
    liveDetection?.phoneDetected ??
    fallback?.phone_detected ??
    false;
  const riskLabel =
    liveDetection?.riskLabel ??
    fallback?.risk_label ??
    "Clear";

  return {
    personsDetected,
    phoneDetected,
    riskLabel,
  };
}

function ScoreRing({ score, size = 100 }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="8"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset .5s ease, stroke .4s ease" }}
      />
      <text
        x="50"
        y="47"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fill: "var(--text)",
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        {score}
      </text>
      <text
        x="50"
        y="63"
        textAnchor="middle"
        style={{
          fill: "var(--muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
        }}
      >
        / 100
      </text>
    </svg>
  );
}

function Waveform({ waveform }) {
  return (
    <div className="waveform">
      {waveform.map((amplitude, index) => (
        <div
          key={`${index}-${amplitude}`}
          className="wave-bar"
          style={{
            height: `${Math.max(amplitude * 100, 18)}%`,
            animationDelay: `${index * 0.04}s`,
            animationDuration: `${0.7 + amplitude * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

function SignalBars({ signals }) {
  const rows = [
    ["Emotion stability", signals.emotionStability],
    ["Eye contact", signals.eyeContactRatio],
    ["Voice calmness", signals.voiceCalmness],
    ["Speaking pace", signals.speakingPace],
    ["Micro-expression", signals.microExpression],
  ];

  return (
    <div>
      {rows.map(([label, value]) => (
        <div className="signal-row" key={label}>
          <span className="signal-name">{label}</span>
          <div className="signal-bar-track">
            <div
              className="signal-bar-fill"
              style={{ width: `${value}%`, background: signalColor(value) }}
            />
          </div>
          <span className="signal-val" style={{ color: signalColor(value) }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function FlagsPanel({ flags }) {
  if (!flags.length) {
    return <div className="no-flags">No behavioral flags detected.</div>;
  }

  return (
    <div>
      {[...flags].reverse().map((flag) => (
        <div
          className="flag-item"
          key={`${flag.message}-${flag.time}-${flag.severity}`}
        >
          <div className={`flag-sev ${flag.severity}`} />
          <span className="flag-text">{flag.message}</span>
          <span className="flag-time">{flag.time}</span>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ history, chartRef }) {
  useEffect(() => {
    if (!chartRef.current || history.length < 2) return undefined;

    const existingChart = Chart.getChart(chartRef.current);
    if (existingChart) existingChart.destroy();

    const chart = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels: history.map((point) => point.time),
        datasets: [
          {
            data: history.map((point) => point.score),
            borderColor: "#16c2b0",
            backgroundColor: "rgba(22, 194, 176, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111118",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            titleColor: "#f0f0f4",
            bodyColor: "#7a7a8c",
            callbacks: {
              label: (context) => `Score: ${context.raw}`,
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: {
              color: "#7a7a8c",
              font: { size: 10 },
              stepSize: 25,
            },
            border: { display: false },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [chartRef, history]);

  return (
    <div className="timeline-wrap">
      <canvas ref={chartRef} />
    </div>
  );
}

function CandidateView({ candidateName, onBackToDashboard }) {
  const [sessionId, setSessionId] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [running, setRunning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localDetections, setLocalDetections] = useState([]);
  const [liveDetection, setLiveDetection] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const streamRef = useRef(null);
  const objectModelRef = useRef(null);
  const objectModelPromiseRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return undefined;

    const videoElement = videoRef.current;
    const stream = streamRef.current;

    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
    }

    const playPromise = videoElement.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((playError) => {
        console.error(playError);
      });
    }

    return () => {
      if (!cameraActive && videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [cameraActive]);

  useEffect(() => {
    if (!running || !sessionId) return undefined;

    const intervalId = window.setInterval(async () => {
      try {
        const nextSnapshot = await fetchSnapshot(sessionId);
        setSnapshot(nextSnapshot);
      } catch (requestError) {
        console.error(requestError);
        setError("Live analysis refresh failed. Showing the latest data we have.");
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [running, sessionId]);

  useEffect(() => {
    if (!running || !sessionId || !cameraActive || !videoRef.current) return undefined;

    let cancelled = false;
    let timeoutId = 0;

    async function ensureObjectModel() {
      if (objectModelRef.current) return objectModelRef.current;
      if (objectModelPromiseRef.current) return objectModelPromiseRef.current;
      if (!window.cocoSsd?.load) return null;

      objectModelPromiseRef.current = window.cocoSsd
        .load()
        .then((model) => {
          objectModelRef.current = model;
          return model;
        })
        .catch((modelError) => {
          console.error(modelError);
          return null;
        });

      return objectModelPromiseRef.current;
    }

    async function detectEnvironment() {
      const model = await ensureObjectModel();

      if (cancelled) return;

      if (!model || !videoRef.current || videoRef.current.readyState < 2) {
        timeoutId = window.setTimeout(detectEnvironment, 1800);
        return;
      }

      try {
        const predictions = await model.detect(videoRef.current);
        if (cancelled) return;

        const personsDetected = predictions.filter(
          (prediction) =>
            prediction.class === "person" && prediction.score >= 0.35,
        ).length;
        const phoneDetected = predictions.some(
          (prediction) =>
            prediction.class === "cell phone" && prediction.score >= 0.22,
        );
        const personCount = Math.max(1, personsDetected || 0);
        const suspiciousObjects = [
          ...new Set(
            predictions
              .filter(
                (prediction) =>
                  prediction.class !== "person" &&
                  prediction.class !== "cell phone" &&
                  prediction.score >= 0.55,
              )
              .map((prediction) => formatLabel(prediction.class)),
          ),
        ].slice(0, 3);

        setLocalDetections(suspiciousObjects);
        setLiveDetection({
          personsDetected: personCount,
          phoneDetected,
          riskLabel: deriveRiskLabel(personCount, phoneDetected),
        });

        const updatedSnapshot = await updateEnvironment(sessionId, {
          persons_detected: personCount,
          phone_detected: phoneDetected,
        });
        if (!cancelled) setSnapshot(updatedSnapshot);
      } catch (detectionError) {
        console.error(detectionError);
      }

      timeoutId = window.setTimeout(detectEnvironment, 2200);
    }

    detectEnvironment();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cameraActive, running, sessionId]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setCameraError("");
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (mediaError) {
      console.error(mediaError);
      setCameraActive(false);
      setCameraError("Camera or microphone access was blocked. The demo will keep running with backend simulation.");
    }
  }

  function stopCamera() {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function handleStartSession() {
    if (!candidateName.trim()) return;

    setBusy(true);
    setError("");
    setShowReport(false);
    setFinalReport(null);
    setLocalDetections([]);
    setLiveDetection(null);

    try {
      await startCamera();
      const response = await startSession(candidateName);
      setSessionId(response.session_id);
      setSnapshot(response.snapshot);
      setRunning(true);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to start the interview session. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEndSession() {
    if (!sessionId || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await endSession(sessionId);
      setFinalReport(response.report);
      setRunning(false);
      setSessionId("");
      setShowReport(true);
      stopCamera();
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to end the session and generate the report.");
    } finally {
      setBusy(false);
    }
  }

  const emotionEntries = normalizeEmotionEntries(snapshot);
  const dominantEmotion = snapshot?.facial.dominant || "Confidence";
  const score = snapshot?.score ?? 0;
  const verdict = snapshot?.verdict ?? {
    cls: "safe",
    label: "SAFE",
  };
  const environment = snapshot?.environment;
  const liveEnvironment = buildLiveEnvironment(snapshot, liveDetection);
  const visibleDetections = Array.from(
    new Set([...(environment?.detections || []), ...localDetections]),
  );

  return (
    <>
      <div className="app-header">
        <span className="wordmark">TruthLens AI</span>
        <div className="header-right">
          {running && (
            <>
              <div className="live-dot" />
              <span style={{ fontSize: 12, color: "var(--safe)" }}>LIVE</span>
            </>
          )}
          <span className="chip">{candidateName}</span>
          <span className="chip">{formatTime(snapshot?.elapsed_seconds ?? 0)}</span>
          <span className={sessionChipClass(verdict)}>
            {score} - {verdict.label}
          </span>
          {running ? (
            <button
              className="btn-primary"
              onClick={handleEndSession}
              disabled={busy}
              style={{ padding: "6px 16px", background: "var(--disq)" }}
            >
              {busy ? "Ending..." : "End Session"}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleStartSession}
              disabled={busy}
              style={{ padding: "6px 16px" }}
            >
              {busy ? "Starting..." : "Start Session"}
            </button>
          )}
        </div>
      </div>

      <div className="candidate-layout">
        <div className="video-section">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : (
            <div className="no-cam">
              <div className="cam-icon">AI</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Camera access improves the demo
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", maxWidth: 280 }}>
                {cameraError || 'Click "Start Session" to begin live tracking.'}
              </div>
            </div>
          )}

          {snapshot && (
            <div className="video-status-card env-monitor-card">
              <div className="section-label env-monitor-label">
                Environment Monitoring
              </div>
              <div className="status-grid env-grid">
                <div className="status-block env-block">
                  <span>Persons</span>
                  <strong>{liveEnvironment.personsDetected}</strong>
                </div>
                <div className="status-block env-block">
                  <span>Phone</span>
                  <strong>{liveEnvironment.phoneDetected ? "Yes" : "No"}</strong>
                </div>
                <div className="status-block env-block">
                  <span>Risk</span>
                  <strong>{liveEnvironment.riskLabel}</strong>
                </div>
              </div>
            </div>
          )}

          {running && (
            <div className="video-overlay">
              <div className="scan-line" />
              <div className="corner-bracket tl" />
              <div className="corner-bracket tr" />
              <div className="corner-bracket bl" />
              <div className="corner-bracket br" />
              <div className="emotion-overlay">
                {emotionEntries.slice(0, 4).map((entry) => (
                  <div
                    key={entry.label}
                    className={`emo-pill ${
                      entry.label.toLowerCase() === dominantEmotion.toLowerCase()
                        ? "dominant"
                        : ""
                    }`}
                  >
                    {entry.label} {entry.percent}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar">
          {error ? <div className="sidebar-alert">{error}</div> : null}

          {snapshot ? (
            <>
              <div className="sidebar-section">
                <div className="section-label">Integrity score</div>
                <div className="score-ring-wrap">
                  <ScoreRing score={snapshot.score} size={100} />
                  <div className="score-ring-info">
                    <div
                      className="score-number-big"
                      style={{ color: scoreColor(snapshot.score) }}
                    >
                      {snapshot.score}
                    </div>
                    <div className="score-label-small">out of 100</div>
                  </div>
                </div>
                <div className={`verdict-banner ${verdictBannerClass(snapshot.verdict)}`}>
                  {snapshot.verdict.label}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="section-label">Signal breakdown</div>
                <SignalBars signals={snapshot.signals} />
              </div>

              <div className="sidebar-section">
                <div className="section-label">Facial emotion detection</div>
                <div className="mini-grid">
                  <div className="mini-card">
                    <span>Confidence</span>
                    <strong>{snapshot.facial.confidence}</strong>
                  </div>
                  <div className="mini-card">
                    <span>Stress</span>
                    <strong>{snapshot.facial.stress}</strong>
                  </div>
                  <div className="mini-card">
                    <span>Nervousness</span>
                    <strong>{snapshot.facial.nervousness}</strong>
                  </div>
                  <div className="mini-card">
                    <span>Stability</span>
                    <strong>{snapshot.facial.stability_score}</strong>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="section-label">Voice stress analysis</div>
                <Waveform waveform={snapshot.voice.waveform} />
                <div className="detail-list" style={{ marginTop: 12 }}>
                  <div className="detail-row">
                    <span>Stress level</span>
                    <strong>{snapshot.voice.stress_level}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Pitch variation</span>
                    <strong>{snapshot.voice.pitch_variation}/100</strong>
                  </div>
                  <div className="detail-row">
                    <span>Speech speed</span>
                    <strong>{snapshot.voice.speech_speed}/100</strong>
                  </div>
                  <div className="detail-row">
                    <span>Voice tremor</span>
                    <strong>{snapshot.voice.tremor_index}/100</strong>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="section-label">Behavior tracking</div>
                <div className="detail-list">
                  <div className="detail-row">
                    <span>Eye contact</span>
                    <strong>{snapshot.behavior.eye_contact}/100</strong>
                  </div>
                  <div className="detail-row">
                    <span>Looking away</span>
                    <strong>{snapshot.behavior.looking_away_events}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Head turning</span>
                    <strong>{snapshot.behavior.head_turning}/100</strong>
                  </div>
                  <div className="detail-row">
                    <span>Movement stability</span>
                    <strong>{snapshot.behavior.movement_stability}/100</strong>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="section-label">Environment monitoring</div>
                <div className="detail-list">
                  <div className="detail-row">
                    <span>Risk status</span>
                    <strong>{liveEnvironment.riskLabel}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Persons detected</span>
                    <strong>{liveEnvironment.personsDetected}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Mobile phone</span>
                    <strong>{liveEnvironment.phoneDetected ? "Detected" : "Clear"}</strong>
                  </div>
                </div>
                <div className="detection-list" style={{ marginTop: 12 }}>
                  {visibleDetections.length ? (
                    visibleDetections.map((detection) => (
                      <div className="badge detection-badge" key={detection}>
                        {detection}
                      </div>
                    ))
                  ) : (
                    <div className="badge">single candidate</div>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="section-label">Score timeline</div>
                {snapshot.history.length > 1 ? (
                  <TimelineChart history={snapshot.history} chartRef={timelineRef} />
                ) : (
                  <div className="empty-chart">Awaiting live data...</div>
                )}
              </div>

              <div className="sidebar-section" style={{ flex: 1 }}>
                <div className="section-label">Active flags ({snapshot.flags.length})</div>
                <FlagsPanel flags={snapshot.flags} />
              </div>
            </>
          ) : (
            <div className="sidebar-section">
              <div className="section-label">Session status</div>
              <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>
                Start the interview to activate facial emotion detection, voice stress analysis,
                behavior tracking, and live environment monitoring.
              </div>
            </div>
          )}
        </div>
      </div>

      {showReport && finalReport ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Session Complete</h2>
            <p>
              Final integrity score:
              {" "}
              <strong style={{ color: scoreColor(finalReport.score) }}>
                {finalReport.score}/100 - {finalReport.verdict.label}
              </strong>
            </p>
            <div className="report-preview">
              <div className="rp-row">
                <span>Candidate</span>
                <span>{finalReport.candidate_name}</span>
              </div>
              <div className="rp-row">
                <span>Duration</span>
                <span>{finalReport.duration_label}</span>
              </div>
              <div className="rp-row">
                <span>Final score</span>
                <span style={{ color: scoreColor(finalReport.score) }}>
                  {finalReport.score}/100
                </span>
              </div>
              <div className="rp-row">
                <span>Verdict</span>
                <span>{finalReport.verdict.label}</span>
              </div>
              <div className="rp-row">
                <span>Emotion stability</span>
                <span>{finalReport.signals.emotionStability}</span>
              </div>
              <div className="rp-row">
                <span>Voice calmness</span>
                <span>{finalReport.signals.voiceCalmness}</span>
              </div>
              <div className="rp-row">
                <span>Environment</span>
                <span>{finalReport.environment.risk_label}</span>
              </div>
              <div className="rp-row">
                <span>Flags raised</span>
                <span>{finalReport.flags.length}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowReport(false);
                  onBackToDashboard();
                }}
              >
                Back to Dashboard
              </button>
              <button
                className="btn-primary"
                onClick={() => generateReportPdf(finalReport)}
              >
                Download PDF Report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RecruiterDashboard({ refreshKey, onStartNew }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const chartRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchDashboard();
        if (active) setDashboard(data);
      } catch (requestError) {
        console.error(requestError);
        if (active) setError("Unable to load dashboard insights right now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!chartRef.current || !dashboard?.sessions.length) return undefined;

    const existingChart = Chart.getChart(chartRef.current);
    if (existingChart) existingChart.destroy();

    const chart = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: dashboard.sessions.map((session) => session.name.split(" ")[0]),
        datasets: [
          {
            data: dashboard.sessions.map((session) => session.score),
            backgroundColor: dashboard.sessions.map((session) =>
              chartColor(session.score),
            ),
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111118",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            titleColor: "#f0f0f4",
            bodyColor: "#7a7a8c",
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#7a7a8c", font: { size: 11 } },
            border: { display: false },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: {
              color: "#7a7a8c",
              font: { size: 10 },
              stepSize: 25,
            },
            border: { display: false },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [dashboard]);

  const sessions = dashboard?.sessions ?? [];
  const metrics = dashboard?.metrics ?? {
    total_sessions: 0,
    average_score: 0,
    cleared: 0,
    suspicious: 0,
    disqualified: 0,
  };

  return (
    <>
      <div className="app-header">
        <span className="wordmark">TruthLens AI</span>
        <div className="header-right">
          <div className="nav-tabs">
            <button className="nav-tab active">Dashboard</button>
            <button className="nav-tab" onClick={onStartNew}>
              New session
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dash-grid">
          <div className="metric-card">
            <div className="mc-label">Total sessions</div>
            <div className="mc-value">{metrics.total_sessions}</div>
            <div className="mc-sub">Virtual interview analyses</div>
          </div>
          <div className="metric-card">
            <div className="mc-label">Average score</div>
            <div
              className="mc-value"
              style={{ color: scoreColor(metrics.average_score) }}
            >
              {metrics.average_score}
            </div>
            <div className="mc-sub">Candidate integrity average</div>
          </div>
          <div className="metric-card">
            <div className="mc-label">Cleared</div>
            <div className="mc-value" style={{ color: "var(--safe)" }}>
              {metrics.cleared}
            </div>
            <div className="mc-sub">Score 80 and above</div>
          </div>
          <div className="metric-card">
            <div className="mc-label">High risk</div>
            <div className="mc-value" style={{ color: "var(--disq)" }}>
              {metrics.disqualified}
            </div>
            <div className="mc-sub">Manual rejection candidates</div>
          </div>
        </div>

        {error ? <div className="dashboard-error">{error}</div> : null}

        <div className="chart-grid">
          <div className="chart-card">
            <div className="chart-title">Candidate score comparison</div>
            <div style={{ height: 220 }}>
              {loading ? (
                <div className="empty-chart">Loading dashboard analytics...</div>
              ) : (
                <canvas ref={chartRef} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Verdict distribution</div>
            <div className="tier-breakdown">
              <div className="tier-seg">
                <div className="ts-num" style={{ color: "var(--disq)" }}>
                  {metrics.disqualified}
                </div>
                <div className="ts-lbl">Disqualify</div>
              </div>
              <div className="tier-seg">
                <div className="ts-num" style={{ color: "var(--susp)" }}>
                  {metrics.suspicious}
                </div>
                <div className="ts-lbl">Suspicious</div>
              </div>
              <div className="tier-seg">
                <div className="ts-num" style={{ color: "var(--safe)" }}>
                  {metrics.cleared}
                </div>
                <div className="ts-lbl">Safe</div>
              </div>
            </div>

            <div className="ratio-list">
              <div className="detail-row">
                <span>Safe rate</span>
                <strong>
                  {metrics.total_sessions
                    ? `${Math.round((metrics.cleared / metrics.total_sessions) * 100)}%`
                    : "0%"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Suspicious rate</span>
                <strong>
                  {metrics.total_sessions
                    ? `${Math.round((metrics.suspicious / metrics.total_sessions) * 100)}%`
                    : "0%"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Disqualify rate</span>
                <strong>
                  {metrics.total_sessions
                    ? `${Math.round((metrics.disqualified / metrics.total_sessions) * 100)}%`
                    : "0%"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-bottom">
          <div className="chart-card">
            <div className="chart-title">Session history</div>
            <div className="history-list">
              {sessions.map((session) => (
                <div className="session-card" key={session.id}>
                  <div
                    className="session-avatar"
                    style={{
                      background: avatarBackground(session.score),
                      color: scoreColor(session.score),
                    }}
                  >
                    {session.initials}
                  </div>
                  <div>
                    <div className="sc-name">{session.name}</div>
                    <div className="sc-role">{session.role}</div>
                  </div>
                  <div className="session-meta">
                    <span className={sessionChipClass(session.verdict)}>
                      {session.verdict.label}
                    </span>
                    <span
                      className="sc-score"
                      style={{ color: scoreColor(session.score) }}
                    >
                      {session.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">AI stack and weights</div>
            <div className="stack-list">
              {(dashboard?.stack ?? []).map((row) => (
                <div className="detail-row stack-row" key={`${row.label}-${row.value}`}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
              {(dashboard?.weights ?? []).map((row) => (
                <div className="detail-row weight-row" key={`${row.label}-${row.value}`}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={onStartNew}
              style={{ width: "100%", marginTop: 16, padding: "10px" }}
            >
              Start new session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Landing({ onCandidate, onRecruiter }) {
  const [name, setName] = useState("");
  const [overview, setOverview] = useState(fallbackProjectOverview);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const data = await fetchProjectOverview();
        if (active) setOverview(data);
      } catch (requestError) {
        console.error(requestError);
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="landing">
      <div className="logo">{overview.title}</div>
      <h1>
        Remote
        <br />
        Interview
        <br />
        Integrity.
      </h1>
      <p>{overview.tagline}</p>

      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">AI Analysis Layer</span>
          <h3>Recruiters get one live screen for emotion, voice, movement, and environment risk.</h3>
          <p>{overview.solution}</p>
        </div>
        <div className="hero-features">
          {overview.features.map((feature) => (
            <div className="feature-pill" key={feature.title}>
              {feature.highlight}
            </div>
          ))}
        </div>
      </div>

      <ProjectOverviewPanel overview={overview} />

      <div className="landing-form">
        <input
          type="text"
          placeholder="Enter candidate name..."
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              onCandidate(name.trim());
            }
          }}
        />
        <div className="btn-group">
          <button
            className="btn-primary"
            onClick={() => name.trim() && onCandidate(name.trim())}
            disabled={!name.trim()}
          >
            Start as Candidate
          </button>
          <button className="btn-secondary" onClick={onRecruiter}>
            Recruiter View
          </button>
        </div>
      </div>

      <div className="badge-row">
        <div className="badge">React.js</div>
        <div className="badge">FastAPI</div>
        <div className="badge">OpenCV + DeepFace</div>
        <div className="badge">Librosa</div>
        <div className="badge">YOLO monitoring</div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState("landing");
  const [candidateName, setCandidateName] = useState("");
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  return (
    <div>
      {view === "landing" ? (
        <Landing
          onCandidate={(name) => {
            setCandidateName(name);
            setView("candidate");
          }}
          onRecruiter={() => setView("recruiter")}
        />
      ) : null}

      {view === "candidate" ? (
        <CandidateView
          candidateName={candidateName}
          onBackToDashboard={() => {
            setDashboardRefreshKey((value) => value + 1);
            setView("recruiter");
          }}
        />
      ) : null}

      {view === "recruiter" ? (
        <RecruiterDashboard
          refreshKey={dashboardRefreshKey}
          onStartNew={() => setView("landing")}
        />
      ) : null}
    </div>
  );
}

export default App;
