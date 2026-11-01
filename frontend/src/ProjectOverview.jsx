export const fallbackProjectOverview = {
  title: "TruthLens AI",
  tagline:
    "A real-time interview integrity platform for remote hiring, combining facial cues, voice stress, behavior, and environment analysis in one recruiter workflow.",
  challenge:
    "Virtual interviews make it difficult to assess authenticity with confidence. Recruiters can observe answers, but hidden stress, coaching, environmental interference, and inconsistent behavior often go unnoticed.",
  solution:
    "TruthLens AI fuses webcam and microphone signals into a single live dashboard. The platform is designed to score emotional stability, voice calmness, gaze behavior, and interview-environment risk in real time while flagging suspicious events.",
  outcomes: [
    "Give recruiters objective behavioral signals during remote interviews.",
    "Detect stress, gaze aversion, phone usage, and multiple-person anomalies early.",
    "Aggregate face, voice, and scene cues into a single integrity score and final report.",
  ],
  features: [
    {
      title: "Facial authenticity analysis",
      highlight: "OpenCV + DeepFace",
      description:
        "Track confidence, stress, nervousness, and dominant expressions from live video frames.",
    },
    {
      title: "Voice stress monitoring",
      highlight: "Librosa",
      description:
        "Measure calmness, tremor, pitch instability, and pacing from interview audio segments.",
    },
    {
      title: "Behavioral cue detection",
      highlight: "Scoring engine",
      description:
        "Watch eye contact, head turning, movement stability, and repeated looking-away events.",
    },
    {
      title: "Environment integrity checks",
      highlight: "YOLO object detection",
      description:
        "Flag mobile phones, multiple people in frame, and suspicious interview-environment objects.",
    },
  ],
  pipeline: [
    {
      step: "01",
      title: "Capture interview signals",
      description:
        "Collect webcam frames, microphone samples, and session metadata from the browser.",
      stack: ["React.js", "WebRTC media APIs"],
    },
    {
      step: "02",
      title: "Run AI analyzers",
      description:
        "Process facial emotion, voice stress, and object-detection cues through specialized model layers.",
      stack: ["Python", "OpenCV", "DeepFace", "Librosa", "YOLO"],
    },
    {
      step: "03",
      title: "Fuse behavioral evidence",
      description:
        "Normalize model outputs into weighted signals, environment penalties, and recruiter-facing flags.",
      stack: ["FastAPI", "Scoring pipeline"],
    },
    {
      step: "04",
      title: "Deliver recruiter insight",
      description:
        "Show live dashboards, verdict bands, trend charts, and downloadable interview reports.",
      stack: ["React.js", "Chart.js", "jsPDF"],
    },
  ],
  stack_blueprint: [
    {
      layer: "Frontend",
      tools: ["React.js", "Vite", "Chart.js", "jsPDF"],
      purpose:
        "Interview control surface, live analytics dashboard, and report generation.",
    },
    {
      layer: "Backend",
      tools: ["FastAPI", "Python"],
      purpose:
        "Session orchestration, scoring logic, API delivery, and final report assembly.",
    },
    {
      layer: "Vision AI",
      tools: ["OpenCV", "DeepFace"],
      purpose:
        "Emotion recognition, expression stability, and face-centered behavioral cues.",
    },
    {
      layer: "Audio AI",
      tools: ["Librosa"],
      purpose:
        "Voice stress extraction, speech pacing, and tremor-oriented signal engineering.",
    },
    {
      layer: "Environment AI",
      tools: ["YOLO"],
      purpose:
        "Phone detection, multiple-person detection, and suspicious-object monitoring.",
    },
  ],
};

export function ProjectOverviewPanel({ overview }) {
  const data = overview || fallbackProjectOverview;

  return (
    <div className="overview-shell">
      <div className="overview-grid">
        <section className="overview-card overview-story">
          <div className="section-label section-label-accent">Problem statement</div>
          <h2>{data.title}</h2>
          <p className="overview-lead">{data.tagline}</p>
          <div className="story-block">
            <span>Challenge</span>
            <p>{data.challenge}</p>
          </div>
          <div className="story-block">
            <span>Proposed solution</span>
            <p>{data.solution}</p>
          </div>
        </section>

        <section className="overview-card">
          <div className="section-label section-label-accent">Recruiter outcomes</div>
          <div className="outcome-list">
            {data.outcomes.map((outcome) => (
              <div className="outcome-item" key={outcome}>
                {outcome}
              </div>
            ))}
          </div>
          <div className="overview-note">
            This build uses a simulated inference engine with the same API contract the
            real OpenCV, DeepFace, Librosa, and YOLO pipeline would populate.
          </div>
        </section>
      </div>

      <section className="overview-card">
        <div className="section-label section-label-accent">Core modules</div>
        <div className="feature-card-grid">
          {data.features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-highlight">{feature.highlight}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-card">
        <div className="section-label section-label-accent">Processing pipeline</div>
        <div className="pipeline-grid">
          {data.pipeline.map((stage) => (
            <article className="pipeline-step" key={stage.step}>
              <div className="pipeline-badge">{stage.step}</div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
              <div className="pipeline-stack">
                {stage.stack.map((item) => (
                  <span className="pipeline-pill" key={`${stage.step}-${item}`}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-card">
        <div className="section-label section-label-accent">Stack blueprint</div>
        <div className="stack-blueprint">
          {data.stack_blueprint.map((item) => (
            <article className="blueprint-card" key={item.layer}>
              <div className="blueprint-label">{item.layer}</div>
              <h3>{item.tools.join(" + ")}</h3>
              <p>{item.purpose}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
