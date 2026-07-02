"use client";
import {
  Mic,
  Brain,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
} from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Mic,
      title: "Real-time Transcription",
      description:
        "Accurate speech-to-text conversion with speaker identification and timestamps",
      color: "indigo",
    },
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Intelligent extraction of key legal points, clauses, and compliance flags",
      color: "purple",
    },
    {
      icon: AlertTriangle,
      title: "Compliance Detection",
      description:
        "Automatic identification of GDPR, IP rights, and liability issues",
      color: "amber",
    },
    {
      icon: CheckCircle,
      title: "Action Items",
      description:
        "Generate actionable tasks and follow-ups from meeting discussions",
      color: "emerald",
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description:
        "Track meeting insights, trends, and team performance over time",
      color: "blue",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Bank-grade encryption and compliance with data protection regulations",
      color: "red",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      indigo: "bg-indigo-100 text-indigo-600",
      purple: "bg-purple-100 text-purple-600",
      amber: "bg-amber-100 text-amber-600",
      emerald: "bg-emerald-100 text-emerald-600",
      blue: "bg-blue-100 text-blue-600",
      red: "bg-red-100 text-red-600",
    };
    return colors[color] || colors.indigo;
  };

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need for Legal Meetings
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive tools to streamline your legal workflow from start to
            finish
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all"
            >
              <div
                className={`w-14 h-14 ${getColorClasses(
                  feature.color
                )} rounded-xl flex items-center justify-center mb-4`}
              >
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
