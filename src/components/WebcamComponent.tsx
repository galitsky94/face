import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

interface WebcamComponentProps {
  onScoreUpdate: (score: number, feedback: string, isFinal?: boolean, attributes?: FundabilityAttributes) => void;
}

interface FaceDetectionResult {
  detection: {
    score: number;
    box?: { x: number; y: number; width: number; height: number };
  };
  expressions: faceapi.FaceExpressions;
}

// New interface for additional attributes
export interface FundabilityAttributes {
  charisma: number;
  dumbness: number;
  single: number;
}

const WebcamComponent = ({ onScoreUpdate }: WebcamComponentProps) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [finalScoreCalculated, setFinalScoreCalculated] = useState(false);
  const detectionIntervalRef = useRef<number | null>(null);

  const initialAnimatedScoreRef = useRef<number | null>(null);
  const finalAnimatedTargetScoreRef = useRef<number | null>(null);

  // References for additional attributes
  const initialAttributesRef = useRef<FundabilityAttributes | null>(null);
  const finalAttributesRef = useRef<FundabilityAttributes | null>(null);

  const ANALYSIS_DURATION_MS = 5000;

  const feedbackMessages = [
    { minScore: 0, maxScore: 20, message: "Even your screen protector is crying!" },
    { minScore: 21, maxScore: 40, message: "VCs might fund you... if you wore a paper bag." },
    { minScore: 41, maxScore: 60, message: "Middle of the pack. Try adding glasses?" },
    { minScore: 61, maxScore: 80, message: "Not bad! You could raise a decent seed round." },
    { minScore: 81, maxScore: 95, message: "Unicorn material! Silicon Valley is calling!" },
    { minScore: 96, maxScore: 100, message: "Are you Elon Musk's secret twin?!" }
  ];

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        setIsModelLoaded(true);
        console.log('Face detection models loaded');
      } catch (error) {
        console.error('Error loading face detection models:', error);
      }
    };
    loadModels();
    return () => {
      if (detectionIntervalRef.current) window.clearInterval(detectionIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isModelLoaded && webcamRef.current?.video) {
      const video = webcamRef.current.video;
      if (video.readyState === 4) startFaceDetection();
      else video.addEventListener('play', startFaceDetection);
      return () => video.removeEventListener('play', startFaceDetection);
    }
  }, [isModelLoaded]);

  const calculateRawFundabilityScore = (detection: FaceDetectionResult): number => {
    if (!detection) return 0;
    const { score: confidence } = detection.detection;
    const { happy = 0, neutral = 0, sad = 0, angry = 0, surprised = 0 } = detection.expressions;
    const baseScore = confidence * 50;
    const expressionBonus = (happy * 30) + (neutral * 15) + (surprised * 10);
    const expressionPenalty = (sad * 20) + (angry * 25);
    const seedValue = (confidence * 100) + (happy * 50) + (neutral * 25);
    const deterministicFactor = Math.sin(seedValue) * 5;
    let totalScore = baseScore + expressionBonus - expressionPenalty + deterministicFactor;
    return Math.round(Math.max(0, Math.min(100, totalScore)));
  };

  // Calculate additional attributes based on facial detection
  const calculateAttributes = (detection: FaceDetectionResult): FundabilityAttributes => {
    const { score: confidence } = detection.detection;
    const { happy = 0, neutral = 0, sad = 0, angry = 0, surprised = 0, disgusted = 0 } = detection.expressions;

    // Charisma - based on confidence, happiness, and surprise
    const charismaBase = Math.max(0, Math.min(100,
      confidence * 40 +
      happy * 40 +
      surprised * 20 +
      Math.sin(confidence * 50) * 10
    ));

    // Dumbness - inverse relation to neutral expression, higher with surprise and disgust
    const dumbBase = Math.max(0, Math.min(100,
      (1 - neutral) * 40 +
      surprised * 30 +
      disgusted * 30 +
      Math.cos(confidence * 70) * 15
    ));

    // Single score - higher when sad, neutral, or angry
    const singleBase = Math.max(0, Math.min(100,
      sad * 30 +
      neutral * 25 +
      angry * 25 +
      (1 - happy) * 20 +
      Math.sin(confidence * 90) * 10
    ));

    return {
      charisma: Math.round(charismaBase),
      dumbness: Math.round(dumbBase),
      single: Math.round(singleBase)
    };
  };

  // Calculate deterministic target values for the attributes
  const calculateDeterministicAttributeTargets = (
    initialAttrs: FundabilityAttributes,
    detection: FaceDetectionResult
  ): FundabilityAttributes => {
    const confidence = detection.detection.score;
    const { happy = 0 } = detection.expressions;

    // Create deterministic shifts for each attribute
    const charismaShift = Math.sin(confidence * 100 + happy * 60) * 15;
    const dumbShift = Math.sin(confidence * 120 + happy * 40) * 12;
    const singleShift = Math.sin(confidence * 140 + happy * 20) * 18;

    // Apply shifts with limits
    const charismaTarget = Math.max(10, Math.min(95, initialAttrs.charisma + charismaShift));
    const dumbTarget = Math.max(5, Math.min(90, initialAttrs.dumbness + dumbShift));
    const singleTarget = Math.max(15, Math.min(95, initialAttrs.single + singleShift));

    return {
      charisma: Math.round(charismaTarget),
      dumbness: Math.round(dumbTarget),
      single: Math.round(singleTarget)
    };
  };

  // Generate interpolated attributes based on progress
  const interpolateAttributes = (
    initial: FundabilityAttributes,
    target: FundabilityAttributes,
    progress: number
  ): FundabilityAttributes => {
    return {
      charisma: Math.round(initial.charisma + (target.charisma - initial.charisma) * progress),
      dumbness: Math.round(initial.dumbness + (target.dumbness - initial.dumbness) * progress),
      single: Math.round(initial.single + (target.single - initial.single) * progress)
    };
  };

  const getFeedbackMessage = (score: number): string => {
    const feedback = feedbackMessages.find(fb => score >= fb.minScore && score <= fb.maxScore);
    return feedback?.message || "Analyzing...";
  };

  const calculateDeterministicTargetScore = (initialScore: number, detection: FaceDetectionResult): number => {
    let target = initialScore;
    const confidence = detection.detection.score;
    const happy = detection.expressions.happy || 0;

    // Create a deterministic shift based on initial confidence and happiness
    const shiftFactor = Math.sin(confidence * 100 + happy * 50) * 15; // Max +/- 15 shift
    target += shiftFactor;

    // Add a small constant drift to ensure movement if shiftFactor is near zero
    if (Math.abs(shiftFactor) < 3) {
        target += (confidence > 0.5 ? 5 : -5);
    }

    return Math.round(Math.max(15, Math.min(90, target))); // Keep target within reasonable bounds
  };


  const startFaceDetection = async () => {
    if (!webcamRef.current?.video || !canvasRef.current) return;
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    if (detectionIntervalRef.current) window.clearInterval(detectionIntervalRef.current);

    setAnalysisStartTime(null);
    setFinalScoreCalculated(false);
    initialAnimatedScoreRef.current = null;
    finalAnimatedTargetScoreRef.current = null;
    initialAttributesRef.current = null;
    finalAttributesRef.current = null;

    detectionIntervalRef.current = window.setInterval(async () => {
      const currentTime = Date.now();
      if (!webcamRef.current?.video || video.paused || video.ended) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);

        if (detections && detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          // Draw detection boxes
          faceapi.draw.drawDetections(canvas, resizedDetections);

          // Add detection score overlay to the first face
          if (resizedDetections.length > 0) {
            const detection = resizedDetections[0];
            const { box } = detection.detection;
            const score = detection.detection.score.toFixed(2);

            // Draw detection confidence score
            context?.save();
            context!.font = '16px Arial';
            context!.fillStyle = 'blue';
            context!.fillRect(box.x, box.y - 20, 40, 20);
            context!.fillStyle = 'white';
            context!.fillText(score, box.x + 5, box.y - 5);
            context?.restore();

            // Draw detection box in blue
            context?.save();
            context!.strokeStyle = 'blue';
            context!.lineWidth = 2;
            context!.strokeRect(box.x, box.y, box.width, box.height);
            context?.restore();
          }

          const person = resizedDetections[0];

          if (finalScoreCalculated) return; // Do nothing more if final score is set

          if (analysisStartTime === null) {
            const startTime = Date.now();
            setAnalysisStartTime(startTime);

            // Initialize scores and attributes
            const initialScore = calculateRawFundabilityScore(person);
            initialAnimatedScoreRef.current = initialScore;
            finalAnimatedTargetScoreRef.current = calculateDeterministicTargetScore(initialScore, person);

            // Initialize attributes
            const initialAttrs = calculateAttributes(person);
            initialAttributesRef.current = initialAttrs;
            finalAttributesRef.current = calculateDeterministicAttributeTargets(initialAttrs, person);

            console.log(`WEBCAM: Initial Score: ${initialScore}, Target: ${finalAnimatedTargetScoreRef.current}`);
            console.log(`WEBCAM: Initial Attributes:`, initialAttrs);
            console.log(`WEBCAM: Target Attributes:`, finalAttributesRef.current);
          }

          const timeElapsed = currentTime - (analysisStartTime || currentTime);

          if (timeElapsed >= ANALYSIS_DURATION_MS) {
            setFinalScoreCalculated(true);
            const finalScore = finalAnimatedTargetScoreRef.current !== null ?
                              finalAnimatedTargetScoreRef.current :
                              calculateRawFundabilityScore(person);

            const finalAttributes = finalAttributesRef.current !== null ?
                                  finalAttributesRef.current :
                                  calculateAttributes(person);

            onScoreUpdate(finalScore, getFeedbackMessage(finalScore), true, finalAttributes);
            console.log('WEBCAM: Final score sent:', finalScore);
            console.log('WEBCAM: Final attributes sent:', finalAttributes);
          } else {
            if (initialAnimatedScoreRef.current !== null &&
                finalAnimatedTargetScoreRef.current !== null &&
                initialAttributesRef.current !== null &&
                finalAttributesRef.current !== null) {

              const progress = Math.min(1, timeElapsed / ANALYSIS_DURATION_MS);

              // Linear interpolation for score
              const animatedScore = initialAnimatedScoreRef.current +
                                    (finalAnimatedTargetScoreRef.current - initialAnimatedScoreRef.current) * progress;
              const currentDisplayScore = Math.round(Math.max(0, Math.min(100, animatedScore)));

              // Interpolate attributes
              const currentAttributes = interpolateAttributes(
                initialAttributesRef.current,
                finalAttributesRef.current,
                progress
              );

              onScoreUpdate(currentDisplayScore, getFeedbackMessage(currentDisplayScore), false, currentAttributes);
            }
          }
        }
      } catch (error) {
        // console.error('Error in face detection loop:', error);
      }
    }, 100);
  };

  const handleUserMediaError = () => setHasCamera(false);

  return (
    <div className="relative webcam-container">
      {!hasCamera ? (
        <div className="flex flex-col items-center justify-center h-[350px] bg-gray-900 p-4 text-white">
          <div className="text-red-400 text-4xl mb-2">😕</div>
          <p className="text-center">Camera access denied or not available.</p>
          <p className="text-center text-sm mt-2">Please allow camera access to use this app.</p>
        </div>
      ) : (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
            onUserMediaError={handleUserMediaError}
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        </>
      )}
    </div>
  );
};

export default WebcamComponent;
