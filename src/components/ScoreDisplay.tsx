import { useEffect, useState, useRef } from 'react';
import { FundabilityAttributes } from './WebcamComponent';

interface ScoreDisplayProps {
  score: number | null;
  feedback: string;
  isFinalized: boolean;
  attributes: FundabilityAttributes | null;
}

const ScoreDisplay = ({ score, feedback, isFinalized, attributes }: ScoreDisplayProps) => {
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [scoreColor, setScoreColor] = useState<string>('text-gray-400');
  const animationFrameRef = useRef<number | null>(null);
  const currentScoreRef = useRef<number>(0);

  // Define refs and states for animated attributes
  const [displayAttributes, setDisplayAttributes] = useState<FundabilityAttributes>({
    charisma: 0,
    dumbness: 0,
    single: 0
  });
  const currentAttributesRef = useRef<FundabilityAttributes>({
    charisma: 0,
    dumbness: 0,
    single: 0
  });

  // Animation for main score
  useEffect(() => {
    if (score === null) {
      setDisplayScore(0);
      currentScoreRef.current = 0;
      return;
    }

    // If score is finalized, immediately set and stop any animation
    if (isFinalized) {
      setDisplayScore(score);
      currentScoreRef.current = score;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Smooth animation towards the new score from WebcamComponent
    const targetScore = score;
    const DURATION = 150; // Short duration to quickly follow WebcamComponent's updates

    let startTime: number | null = null;
    const startValue = currentScoreRef.current;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / DURATION);

      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const newDisplayScore = Math.round(startValue + (targetScore - startValue) * easedProgress);
      setDisplayScore(newDisplayScore);
      currentScoreRef.current = newDisplayScore;

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    };

  }, [score, isFinalized]);

  // Animation for attributes
  useEffect(() => {
    if (!attributes) {
      return;
    }

    // If attributes are finalized, set them immediately
    if (isFinalized) {
      setDisplayAttributes(attributes);
      currentAttributesRef.current = attributes;
      return;
    }

    // Animate attributes
    const DURATION = 150;
    let startTime: number | null = null;
    const startValues = { ...currentAttributesRef.current };
    const targetValues = attributes;

    const animateAttributes = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / DURATION);

      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const newAttributes = {
        charisma: Math.round(startValues.charisma + (targetValues.charisma - startValues.charisma) * easedProgress),
        dumbness: Math.round(startValues.dumbness + (targetValues.dumbness - startValues.dumbness) * easedProgress),
        single: Math.round(startValues.single + (targetValues.single - startValues.single) * easedProgress)
      };

      setDisplayAttributes(newAttributes);
      currentAttributesRef.current = newAttributes;

      if (progress < 1) {
        window.requestAnimationFrame(animateAttributes);
      }
    };

    window.requestAnimationFrame(animateAttributes);
  }, [attributes, isFinalized]);

  // Update the score color based on value
  useEffect(() => {
    if (score === null) {
      setScoreColor('text-gray-400');
      return;
    }
    if (score < 30) setScoreColor('text-red-500');
    else if (score < 60) setScoreColor('text-yellow-500');
    else if (score < 85) setScoreColor('text-green-500');
    else setScoreColor('text-blue-500');
  }, [score]);

  // Helper function to get color class based on attribute value
  const getAttributeColor = (value: number): string => {
    if (value < 30) return 'text-red-500';
    if (value < 50) return 'text-orange-500';
    if (value < 70) return 'text-yellow-500';
    if (value < 85) return 'text-green-500';
    return 'text-blue-500';
  };

  // Helper function to render attribute bar
  const renderAttributeBar = (
    name: string,
    value: number,
    color: string
  ) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-white text-sm font-medium">{name}</span>
        <span className={`${color} font-bold`}>{value}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${value}%`,
            backgroundColor:
              value < 30 ? '#EF4444' :
              value < 50 ? '#F97316' :
              value < 70 ? '#EAB308' :
              value < 85 ? '#22C55E' : '#3B82F6'
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4">
      {score === null ? (
        <div className="text-center text-white">
          <p className="text-2xl mb-4">Looking for your face...</p>
          <p className="text-sm opacity-70">Position yourself in front of the camera</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6 w-full">
            <h2 className="text-xl text-white mb-2">
              {isFinalized ? 'Your Final Fundability Score' : 'Total Score'}
            </h2>
            <div className={`text-7xl font-bold ${scoreColor} ${isFinalized ? 'score-pulse' : ''} mb-3 transition-colors duration-300`}>
              {displayScore}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
              <div
                className="h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${displayScore}%`,
                  backgroundColor: displayScore < 30 ? '#EF4444' :
                                displayScore < 60 ? '#EAB308' :
                                displayScore < 85 ? '#22C55E' : '#3B82F6'
                }}
              />
            </div>

            {/* Additional Attributes Section */}
            <div className="w-full mt-4">

              {renderAttributeBar(
                'Charisma',
                displayAttributes.charisma,
                getAttributeColor(displayAttributes.charisma)
              )}

              {renderAttributeBar(
                'Dumbness',
                displayAttributes.dumbness,
                getAttributeColor(displayAttributes.dumbness)
              )}

              {renderAttributeBar(
                'Single',
                displayAttributes.single,
                getAttributeColor(displayAttributes.single)
              )}

              {isFinalized && (
                <p className="text-white/70 text-xs mt-4 text-center">
                  Your scores have been locked in. Investors are being notified.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScoreDisplay;
