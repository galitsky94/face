import { useEffect, useState } from 'react';
import WebcamComponent, { FundabilityAttributes } from './components/WebcamComponent';
import ScoreDisplay from './components/ScoreDisplay';
import './App.css';

function App() {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalFeedback, setFinalFeedback] = useState<string>('');
  const [isAnalysisComplete, setIsAnalysisComplete] = useState<boolean>(false);

  // Add states for the new attributes
  const [attributes, setAttributes] = useState<FundabilityAttributes | null>(null);
  const [finalAttributes, setFinalAttributes] = useState<FundabilityAttributes | null>(null);

  useEffect(() => {
    // Set loading to false after models are loaded
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleScoreUpdate = (
    newScore: number,
    newFeedback: string,
    isFinal: boolean = false,
    newAttributes?: FundabilityAttributes
  ) => {
    // If analysis is already complete, don't update the score anymore
    if (isAnalysisComplete) return;

    if (isFinal) {
      // Once we get a final score, lock it in and never change it again
      setFinalScore(newScore);
      setFinalFeedback(newFeedback);
      setScore(newScore);
      setFeedback(newFeedback);

      // Update final attributes if provided
      if (newAttributes) {
        setFinalAttributes(newAttributes);
        setAttributes(newAttributes);
      }

      setIsAnalysisComplete(true);
      console.log('FINAL SCORE LOCKED:', newScore);
      if (newAttributes) console.log('FINAL ATTRIBUTES LOCKED:', newAttributes);
    } else if (!isAnalysisComplete) {
      // Only update temporary scores if we haven't finalized yet
      setScore(newScore);
      setFeedback(newFeedback);

      // Update current attributes if provided
      if (newAttributes) {
        setAttributes(newAttributes);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Fund Score</h1>
        <p className="text-blue-200 text-lg md:text-xl max-w-xs md:max-w-md mx-auto">Do you look fundable enough? Let's find out!</p>
      </header>

      <main className="w-full max-w-4xl bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10 h-[60vh]">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-lg">Loading face analyzer...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 p-6">
            <div className="bg-black/20 rounded-xl overflow-hidden">
              <WebcamComponent onScoreUpdate={handleScoreUpdate} />
            </div>
            <div className="flex flex-col justify-center">
              <ScoreDisplay
                score={score}
                feedback={feedback}
                isFinalized={isAnalysisComplete}
                attributes={attributes}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-6 text-blue-200 text-sm text-center w-full">
        <p className="md:w-[600px] mx-auto whitespace-nowrap md:whitespace-nowrap">This app is for entertainment purposes only. But you should take it seriously.</p>
      </footer>
    </div>
  );
}

export default App;
