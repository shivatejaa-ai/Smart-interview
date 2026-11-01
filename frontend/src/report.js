import { jsPDF } from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_MARGIN = 14;

function colorFromScore(score) {
  if (score >= 80) {
    return [34, 200, 122];
  }
  if (score >= 55) {
    return [245, 166, 35];
  }
  return [240, 79, 79];
}

function colorText(score) {
  const [red, green, blue] = colorFromScore(score);
  return `rgba(${red}, ${green}, ${blue}, 0.95)`;
}

function sectionHeader(doc, title, y) {
  doc.setFillColor(240, 240, 248);
  doc.rect(PAGE_MARGIN, y - 4, PAGE_WIDTH - PAGE_MARGIN * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 60);
  doc.text(title, PAGE_MARGIN, y);
  return y + 8;
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

function environmentSafetyScore(environment) {
  let safety = 100;
  safety -= Math.max(0, environment.persons_detected - 1) * 35;
  safety -= environment.phone_detected ? 25 : 0;
  safety -= Math.min(20, environment.suspicious_objects.length * 10);

  if (environment.risk_label === "Review") safety -= 15;
  if (environment.risk_label === "High Risk") safety -= 35;

  return Math.max(10, Math.min(100, safety));
}

function modalityScores(report) {
  return [
    { label: "Facial Stability", value: report.facial.stability_score },
    { label: "Voice Calmness", value: report.signals.voiceCalmness },
    { label: "Eye Contact", value: report.behavior.eye_contact },
    { label: "Movement Stability", value: report.behavior.movement_stability },
    { label: "Environment Safety", value: environmentSafetyScore(report.environment) },
  ];
}

function emotionComposition(report) {
  const rawItems = [
    { label: "Confidence", value: report.facial.confidence, color: [34, 200, 122] },
    { label: "Stress", value: report.facial.stress, color: [240, 79, 79] },
    { label: "Nervousness", value: report.facial.nervousness, color: [245, 166, 35] },
    { label: "Calmness", value: report.signals.voiceCalmness, color: [72, 143, 255] },
  ];
  const total = rawItems.reduce((sum, item) => sum + item.value, 0) || 1;

  return rawItems.map((item) => ({
    ...item,
    percent: Math.round((item.value / total) * 100),
  }));
}

function createHorizontalBarChartImage({ title, subtitle, items }) {
  const { canvas, ctx } = createCanvas(920, 500);
  const left = 220;
  const right = 80;
  const top = 120;
  const chartWidth = canvas.width - left - right;
  const barHeight = 18;
  const rowGap = 62;

  ctx.fillStyle = "#111118";
  ctx.font = "700 30px Arial";
  ctx.fillText(title, 38, 48);
  ctx.font = "400 16px Arial";
  ctx.fillStyle = "#7a7a8c";
  ctx.fillText(subtitle, 38, 78);

  [0, 25, 50, 75, 100].forEach((tick) => {
    const x = left + (chartWidth * tick) / 100;
    ctx.strokeStyle = "#eceef4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top - 24);
    ctx.lineTo(x, top + rowGap * (items.length - 1) + 26);
    ctx.stroke();

    ctx.fillStyle = "#7a7a8c";
    ctx.font = "400 13px Arial";
    ctx.fillText(String(tick), x - 7, top - 34);
  });

  items.forEach((item, index) => {
    const y = top + index * rowGap;
    const barWidth = (chartWidth * item.value) / 100;

    ctx.fillStyle = "#222430";
    ctx.font = "600 18px Arial";
    ctx.fillText(item.label, 38, y + 5);

    ctx.fillStyle = "#edeff5";
    ctx.fillRect(left, y - 14, chartWidth, barHeight);

    ctx.fillStyle = colorText(item.value);
    ctx.fillRect(left, y - 14, barWidth, barHeight);

    ctx.fillStyle = "#111118";
    ctx.font = "700 18px Arial";
    ctx.fillText(`${item.value}`, left + chartWidth + 20, y + 2);
  });

  return canvas.toDataURL("image/png");
}

function createWaveformChartImage({ title, subtitle, waveform, score }) {
  const { canvas, ctx } = createCanvas(920, 430);
  const left = 48;
  const top = 110;
  const width = 820;
  const height = 220;
  const values = waveform.length ? waveform : [0.35, 0.48, 0.42, 0.6, 0.38, 0.52];
  const strokeColor = colorText(score);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  ctx.fillStyle = "#111118";
  ctx.font = "700 30px Arial";
  ctx.fillText(title, 38, 48);
  ctx.font = "400 16px Arial";
  ctx.fillStyle = "#7a7a8c";
  ctx.fillText(subtitle, 38, 78);

  for (let index = 0; index <= 4; index += 1) {
    const y = top + (height * index) / 4;
    ctx.strokeStyle = "#eceef4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = left + index * step;
    const y = top + height - value * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(left, top + height);
  ctx.closePath();

  const fillGradient = ctx.createLinearGradient(0, top, 0, top + height);
  fillGradient.addColorStop(0, colorText(score).replace("0.95", "0.28"));
  fillGradient.addColorStop(1, colorText(score).replace("0.95", "0.04"));
  ctx.fillStyle = fillGradient;
  ctx.fill();

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = left + index * step;
    const y = top + height - value * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  values.forEach((value, index) => {
    const x = left + index * step;
    const y = top + height - value * height;
    ctx.beginPath();
    ctx.fillStyle = strokeColor;
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#7a7a8c";
  ctx.font = "400 13px Arial";
  ctx.fillText("Low amplitude", left, top + height + 26);
  ctx.fillText("High amplitude", left + width - 86, top + 12);

  return canvas.toDataURL("image/png");
}

function createDonutChartImage({ title, subtitle, items, score }) {
  const { canvas, ctx } = createCanvas(920, 430);
  const centerX = 250;
  const centerY = 235;
  const radius = 96;
  const lineWidth = 34;
  let startAngle = -Math.PI / 2;

  ctx.fillStyle = "#111118";
  ctx.font = "700 30px Arial";
  ctx.fillText(title, 38, 48);
  ctx.font = "400 16px Arial";
  ctx.fillStyle = "#7a7a8c";
  ctx.fillText(subtitle, 38, 78);

  ctx.strokeStyle = "#eceef4";
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  items.forEach((item) => {
    const endAngle = startAngle + (Math.PI * 2 * item.percent) / 100;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${item.color[0]}, ${item.color[1]}, ${item.color[2]}, 0.95)`;
    ctx.lineWidth = lineWidth;
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();
    startAngle = endAngle;
  });

  ctx.fillStyle = "#111118";
  ctx.font = "700 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(String(score), centerX, centerY - 5);
  ctx.font = "400 15px Arial";
  ctx.fillStyle = "#7a7a8c";
  ctx.fillText("Integrity Score", centerX, centerY + 20);
  ctx.textAlign = "left";

  items.forEach((item, index) => {
    const y = 160 + index * 46;
    ctx.fillStyle = `rgba(${item.color[0]}, ${item.color[1]}, ${item.color[2]}, 0.95)`;
    ctx.fillRect(470, y - 14, 18, 18);
    ctx.fillStyle = "#111118";
    ctx.font = "600 18px Arial";
    ctx.fillText(item.label, 502, y);
    ctx.fillStyle = "#7a7a8c";
    ctx.font = "400 14px Arial";
    ctx.fillText(`${item.value}/100 · ${item.percent}% share`, 502, y + 20);
  });

  return canvas.toDataURL("image/png");
}

function drawHeader(doc, now, score, verdictLabel) {
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, 210, 40, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(240, 240, 244);
  doc.text("TruthLens AI", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(122, 122, 140);
  doc.text("AI Interview Intelligence Report", 14, 27);
  doc.text(now, 14, 34);

  const scoreRgb = colorFromScore(score);
  doc.setFillColor(...scoreRgb);
  doc.roundedRect(150, 8, 46, 24, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(String(score), 173, 21, { align: "center" });
  doc.setFontSize(8);
  doc.text(verdictLabel, 173, 28, { align: "center" });
}

function drawFooter(doc, pageLabel) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 170);
  doc.text(
    `Generated by TruthLens AI · HackSpireX @ HAVANA'26 · IEEE Student Chapter GITAM · ${pageLabel}`,
    105,
    285,
    { align: "center" },
  );
}

export function generateReportPdf(report) {
  const doc = new jsPDF();
  const now = new Date(report.generated_at).toLocaleString();

  const signalChartImage = createHorizontalBarChartImage({
    title: "Signal Breakdown Graph",
    subtitle: "Weighted signals used inside the behavioral integrity engine",
    items: [
      { label: "Emotion Stability", value: report.signals.emotionStability },
      { label: "Eye Contact Ratio", value: report.signals.eyeContactRatio },
      { label: "Voice Calmness", value: report.signals.voiceCalmness },
      { label: "Speaking Pace", value: report.signals.speakingPace },
      { label: "Micro-Expression", value: report.signals.microExpression },
    ],
  });
  const modalityChartImage = createHorizontalBarChartImage({
    title: "AI Modality Comparison",
    subtitle: "Comparison across facial, voice, behavior, and environment signals",
    items: modalityScores(report),
  });
  const waveformChartImage = createWaveformChartImage({
    title: "Voice Waveform Graph",
    subtitle: "Live audio energy pattern captured during the interview session",
    waveform: report.voice.waveform,
    score: report.score,
  });
  const emotionChartImage = createDonutChartImage({
    title: "Emotion Composition Graph",
    subtitle: "Relative balance of confidence, stress, nervousness, and calmness",
    items: emotionComposition(report),
    score: report.score,
  });

  drawHeader(doc, now, report.score, report.verdict.label);

  let y = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 60);
  doc.text("Candidate Report", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 100);
  doc.text(`Name: ${report.candidate_name}`, 14, y);
  y += 6;
  doc.text(`Session Duration: ${report.duration_label}`, 14, y);
  y += 6;
  doc.text(`Verdict: ${report.verdict.label}`, 14, y);
  y += 6;
  doc.text(`Generated: ${now}`, 14, y);
  y += 14;

  y = sectionHeader(doc, "Signal Breakdown", y);
  const signalRows = [
    ["Emotion Stability", report.signals.emotionStability, 0.25],
    ["Eye Contact Ratio", report.signals.eyeContactRatio, 0.2],
    ["Voice Calmness", report.signals.voiceCalmness, 0.25],
    ["Speaking Pace", report.signals.speakingPace, 0.15],
    ["Micro-Expression", report.signals.microExpression, 0.15],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  signalRows.forEach(([label, value, weight]) => {
    const contribution = (value * weight).toFixed(1);
    const signalRgb = colorFromScore(value);
    doc.setTextColor(80, 80, 100);
    doc.text(label, 14, y);
    doc.setFillColor(...signalRgb);
    doc.rect(92, y - 4, (value / 100) * 80, 5, "F");
    doc.setTextColor(50, 50, 60);
    doc.text(`${value}/100 (contributes ${contribution})`, 176, y, {
      align: "right",
    });
    y += 8;
  });

  y += 6;
  y = sectionHeader(doc, "AI Layer Summary", y);

  const summaryLines = [
    `Facial emotion detection: ${report.facial.dominant} dominant, confidence ${report.facial.confidence}/100, stability ${report.facial.stability_score}/100`,
    `Voice stress analysis: ${report.voice.stress_level}, pitch variation ${report.voice.pitch_variation}/100, speech speed ${report.voice.speech_speed}/100, tremor ${report.voice.tremor_index}/100`,
    `Behavior tracking: eye contact ${report.behavior.eye_contact}/100, looking away ${report.behavior.looking_away_events} times, head turning ${report.behavior.head_turning}/100`,
    `Environment monitoring: ${report.environment.risk_label}, persons ${report.environment.persons_detected}, phone ${report.environment.phone_detected ? "detected" : "not detected"}`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  summaryLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 178);
    doc.text(wrapped, 14, y);
    y += 7 * wrapped.length;
  });

  y += 5;
  y = sectionHeader(doc, "Behavioral Flags", y);

  if (!report.flags.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 100);
    doc.text("No flags raised during this session.", 14, y);
    y += 8;
  } else {
    report.flags.forEach((flag) => {
      const flagColor =
        flag.severity === "high"
          ? [240, 79, 79]
          : flag.severity === "medium"
            ? [245, 166, 35]
            : [34, 200, 122];
      doc.setFillColor(...flagColor);
      doc.circle(17, y - 1.5, 2, "F");
      doc.setTextColor(80, 80, 100);
      const wrapped = doc.splitTextToSize(`${flag.message} [${flag.time}]`, 170);
      doc.text(wrapped, 22, y);
      y += 7 * wrapped.length;
    });
  }

  y += 5;
  y = sectionHeader(doc, "Recruiter Recommendation", y);

  const recommendationBackground =
    report.score >= 80
      ? [220, 248, 235]
      : report.score >= 55
        ? [253, 244, 220]
        : [254, 235, 235];
  doc.setFillColor(...recommendationBackground);
  doc.rect(14, y, 182, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 60);
  doc.text("Recommendation", 18, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  doc.text(doc.splitTextToSize(report.verdict.message, 168), 18, y + 15);

  drawFooter(doc, "Page 1 of 2");

  doc.addPage();
  drawHeader(doc, now, report.score, report.verdict.label);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 60);
  doc.text("Analytic Graphs", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 100);
  doc.text("Visual summaries for the final report outputs", 14, 59);

  doc.addImage(signalChartImage, "PNG", 14, 68, 182, 58);
  doc.addImage(modalityChartImage, "PNG", 14, 132, 182, 58);
  doc.addImage(waveformChartImage, "PNG", 14, 196, 182, 42);
  doc.addImage(emotionChartImage, "PNG", 14, 242, 182, 40);

  drawFooter(doc, "Page 2 of 2");

  doc.save(`TruthLens_AI_Report_${report.candidate_name.replace(/\s+/g, "_")}.pdf`);
}
