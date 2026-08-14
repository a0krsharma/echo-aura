/**
 * app/onboarding/page.tsx
 * ─────────────────────────────────────────────────────
 * Onboarding Flow for New Users
 * Guided setup wizard for new Echo users
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to Echo",
    description: "Your audio-first social platform. Share your voice, discover new sounds, and connect with creators.",
  },
  {
    id: 2,
    title: "Record Your Voice",
    description: "Create audio posts up to 5 minutes. Add captions, hashtags, and share with the world.",
  },
  {
    id: 3,
    title: "Discover Content",
    description: "Explore [ FREQUENCY ], [ WAVES ], and [ STAGE ]. Find audio that resonates with you.",
  },
  {
    id: 4,
    title: "Connect with Others",
    description: "Follow creators, join live rooms, participate in debates, and send [ WIRE ] messages.",
  },
  {
    id: 5,
    title: "You're All Set!",
    description: "Start your Echo journey. Record your first audio post and join the conversation.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Check if onboarding is already completed
        const onboardingCompleted = localStorage.getItem(`onboarding_${user.uid}`);
        if (onboardingCompleted === "true") {
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, router]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      if (user) {
        // Mark onboarding as completed
        localStorage.setItem(`onboarding_${user.uid}`, "true");
        
        // You could also save this to Firestore user profile
        // await updateDoc(doc(db, "users", user.uid), {
        //   onboardingCompleted: true,
        //   onboardingCompletedAt: serverTimestamp(),
        // });
      }
      setCompleted(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.uid}`, "true");
    }
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-sm">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-white/70 text-sm">
              {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, index) => (
            <div
              key={s.id}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "bg-purple-500 scale-125"
                  : index < currentStep
                  ? "bg-blue-500"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        {completed ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to Echo!
            </h2>
            <p className="text-white/70 mb-8">
              Redirecting you to the feed...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                {step.title}
              </h2>
              <p className="text-white/70 text-lg">
                {step.description}
              </p>
            </div>

            {/* Step-specific content */}
            {currentStep === 0 && (
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="text-white">
                    <div className="text-2xl font-bold mb-1">🎙️</div>
                    <div className="text-sm">Record</div>
                  </div>
                  <div className="text-white">
                    <div className="text-2xl font-bold mb-1">🎧</div>
                    <div className="text-sm">Listen</div>
                  </div>
                  <div className="text-white">
                    <div className="text-2xl font-bold mb-1">💬</div>
                    <div className="text-sm">Connect</div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="text-white text-center">
                  <div className="text-4xl mb-4">🎙️</div>
                  <div className="text-sm mb-2">Up to 5 minutes</div>
                  <div className="text-sm mb-2">Add captions & hashtags</div>
                  <div className="text-sm">Share instantly</div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="grid grid-cols-3 gap-4 text-center text-white">
                  <div>
                    <div className="text-xl font-bold mb-1">[ FREQUENCY ]</div>
                    <div className="text-xs">Main Feed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold mb-1">[ WAVES ]</div>
                    <div className="text-xs">Vertical Feed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold mb-1">[ STAGE ]</div>
                    <div className="text-xs">Debates</div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="grid grid-cols-3 gap-4 text-center text-white">
                  <div>
                    <div className="text-xl font-bold mb-1">👥</div>
                    <div className="text-xs">Follow Creators</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold mb-1">🎤</div>
                    <div className="text-xs">Live Rooms</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold mb-1">💬</div>
                    <div className="text-xs">[ WIRE ]</div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="text-white text-center">
                  <div className="text-4xl mb-4">🚀</div>
                  <div className="text-sm mb-4">
                    Ready to start your audio journey?
                  </div>
                  <button
                    onClick={() => router.push("/studio")}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Go to Studio
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white transition-colors"
              >
                Skip
              </button>

              <div className="flex gap-4">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Loading..."
                    : currentStep === STEPS.length - 1
                    ? "Get Started"
                    : "Next"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
