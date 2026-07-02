"use client";
import { Scale, Mic } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { UserButton, useUser, SignInButton } from "@clerk/nextjs";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Scale className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Zudia+
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/")}
              className={`px-4 py-2 font-medium transition-colors ${
                pathname === "/"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-700 hover:text-indigo-600"
              }`}
            >
              Home
            </button>

            {isSignedIn ? (
              <>
                <button
                  onClick={() => router.push("/meeting")}
                  className={`px-6 py-2 font-semibold rounded-lg transition-all ${
                    pathname === "/meeting"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  }`}
                >
                  <Mic className="w-4 h-4 inline mr-2" />
                  Start Meeting
                </button>

                {/* User Profile Section */}
                <div className="flex items-center space-x-3 ml-2">
                  {user && (
                    <span className="text-sm text-gray-600 hidden md:block">
                      {user.firstName ||
                        user.emailAddresses[0].emailAddress.split("@")[0]}
                    </span>
                  )}
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          "w-10 h-10 rounded-full border-2 border-indigo-200 hover:border-indigo-400 transition-colors",
                      },
                    }}
                    afterSignOutUrl="/"
                  />
                </div>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                    Sign In
                  </button>
                </SignInButton>

                <button
                  onClick={() => router.push("/sign-up")}
                  className="px-6 py-2 font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all"
                >
                  <Mic className="w-4 h-4 inline mr-2" />
                  Start Meeting
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
