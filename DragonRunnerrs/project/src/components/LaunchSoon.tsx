import React from "react"
import { Hammer, Loader2 } from "lucide-react"

export default function MultiGame() {
  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <Hammer className="w-20 h-20 text-yellow-400 animate-bounce" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold">Game Under Development</h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-300">
          We’re working hard to bring you something exciting! 🚀
        </p>

        {/* Loading spinner */}
        <div className="flex justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        </div>

        {/* Button */}
        <button
          onClick={() => alert("Stay tuned!")}
          className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-xl shadow-lg hover:bg-yellow-400 transition"
        >
          Notify Me
        </button>
      </div>
    </div>
  )
}
