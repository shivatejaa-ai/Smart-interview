from __future__ import annotations

from .models import OverviewFeature, PipelineStage, ProjectOverviewResponse, TechStackItem


def get_project_overview() -> ProjectOverviewResponse:
    return ProjectOverviewResponse(
        title="TruthLens AI",
        tagline="A real-time interview integrity platform for remote hiring, combining facial cues, voice stress, behavior, and environment analysis in one recruiter workflow.",
        challenge=(
            "Virtual interviews make it difficult to assess authenticity with confidence. "
            "Recruiters can observe answers, but hidden stress, coaching, environmental "
            "interference, and inconsistent behavior often go unnoticed."
        ),
        solution=(
            "TruthLens AI fuses webcam and microphone signals into a single live dashboard. "
            "The platform is designed to score emotional stability, voice calmness, gaze "
            "behavior, and interview-environment risk in real time while flagging suspicious events."
        ),
        outcomes=[
            "Give recruiters objective behavioral signals during remote interviews.",
            "Detect stress, gaze aversion, phone usage, and multiple-person anomalies early.",
            "Aggregate face, voice, and scene cues into a single integrity score and final report.",
        ],
        features=[
            OverviewFeature(
                title="Facial authenticity analysis",
                highlight="OpenCV + DeepFace",
                description="Track confidence, stress, nervousness, and dominant expressions from live video frames.",
            ),
            OverviewFeature(
                title="Voice stress monitoring",
                highlight="Librosa",
                description="Measure calmness, tremor, pitch instability, and pacing from interview audio segments.",
            ),
            OverviewFeature(
                title="Behavioral cue detection",
                highlight="Scoring engine",
                description="Watch eye contact, head turning, movement stability, and repeated looking-away events.",
            ),
            OverviewFeature(
                title="Environment integrity checks",
                highlight="YOLO object detection",
                description="Flag mobile phones, multiple people in frame, and suspicious interview-environment objects.",
            ),
        ],
        pipeline=[
            PipelineStage(
                step="01",
                title="Capture interview signals",
                description="Collect webcam frames, microphone samples, and session metadata from the browser.",
                stack=["React.js", "WebRTC media APIs"],
            ),
            PipelineStage(
                step="02",
                title="Run AI analyzers",
                description="Process facial emotion, voice stress, and object-detection cues through specialized model layers.",
                stack=["Python", "OpenCV", "DeepFace", "Librosa", "YOLO"],
            ),
            PipelineStage(
                step="03",
                title="Fuse behavioral evidence",
                description="Normalize model outputs into weighted signals, environment penalties, and recruiter-facing flags.",
                stack=["FastAPI", "Scoring pipeline"],
            ),
            PipelineStage(
                step="04",
                title="Deliver recruiter insight",
                description="Show live dashboards, verdict bands, trend charts, and downloadable interview reports.",
                stack=["React.js", "Chart.js", "jsPDF"],
            ),
        ],
        stack_blueprint=[
            TechStackItem(
                layer="Frontend",
                tools=["React.js", "Vite", "Chart.js", "jsPDF"],
                purpose="Interview control surface, live analytics dashboard, and report generation.",
            ),
            TechStackItem(
                layer="Backend",
                tools=["FastAPI", "Python"],
                purpose="Session orchestration, scoring logic, API delivery, and final report assembly.",
            ),
            TechStackItem(
                layer="Vision AI",
                tools=["OpenCV", "DeepFace"],
                purpose="Emotion recognition, expression stability, and face-centered behavioral cues.",
            ),
            TechStackItem(
                layer="Audio AI",
                tools=["Librosa"],
                purpose="Voice stress extraction, speech pacing, and tremor-oriented signal engineering.",
            ),
            TechStackItem(
                layer="Environment AI",
                tools=["YOLO"],
                purpose="Phone detection, multiple-person detection, and suspicious-object monitoring.",
            ),
        ],
    )
