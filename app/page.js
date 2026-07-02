"use client";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Layout Components
import Navbar from "./components/layout/Navbar";
import HeroSection from "./components/layout/HeroSection";
import FeaturesSection from "./components/layout/FeaturesSection";
import AudioUploadSection from "./components/layout/AudioUploadSection";
import Footer from "./components/layout/Footer";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const handleStartMeeting = () => {
    if (isSignedIn) {
      // User is logged in, go to meeting page
      router.push("/meeting");
    } else {
      // User is not logged in, redirect to sign-in
      router.push("/sign-in");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <HeroSection onStartMeeting={handleStartMeeting} />
      <FeaturesSection />
      <AudioUploadSection />
      <Footer />
    </div>
  );
}
