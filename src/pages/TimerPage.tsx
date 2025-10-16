import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TimerPage: React.FC = () => {
  const [currentCount, setCurrentCount] = useState(0);
  const targetCount = 301;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Animate counter from 0 to target
    const duration = 3000; // 3 seconds
    const steps = 60;
    const increment = targetCount / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCurrentCount(targetCount);
        clearInterval(timer);
      } else {
        setCurrentCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  // Generate random signup times for the "recent signups" section
  const recentSignups = [
    { name: "Sarah Chen", time: "2m ago", location: "San Francisco" },
    { name: "Marcus Rodriguez", time: "4m ago", location: "Austin" },
    { name: "Emily Watson", time: "7m ago", location: "London" },
    { name: "David Kim", time: "9m ago", location: "Seoul" },
    { name: "Alex Thompson", time: "12m ago", location: "New York" },
    { name: "Lisa Zhang", time: "15m ago", location: "Toronto" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Main counter section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-center mb-16"
        >
          {/* Wispix AI Logo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
              <span className="font-['Poppins'] font-semibold">Wispix AI</span>
            </h1>
            <p className="text-gray-400 text-lg">Waitlist Tracker</p>
          </motion.div>

          {/* Main counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="relative mb-8"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 scale-110" />
              
              {/* Main counter container */}
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 md:p-16">
                <div className="text-center">
                  <motion.div
                    key={currentCount}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-8xl md:text-9xl font-bold text-white mb-4 font-['Poppins']"
                  >
                    {isVisible ? currentCount.toLocaleString() : '0'}
                  </motion.div>
                  
                  <p className="text-2xl md:text-3xl text-gray-300 font-light">
                    Founders & Teams
                  </p>
                  <p className="text-lg text-green-400 mt-2">
                    Ready to Build Their AI Workforce
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="text-center mb-4">
              <span className="text-gray-400 text-sm">Progress to 500 Founding Spots</span>
            </div>
            <div className="bg-gray-700/50 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentCount / 500) * 100}%` }}
                transition={{ duration: 2, delay: 2.5 }}
                className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0</span>
              <span>500</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Recent signups section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3 }}
          className="w-full max-w-2xl"
        >
          <h3 className="text-2xl font-semibold text-white text-center mb-8 font-['Poppins']">
            Recent Signups
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentSignups.map((signup, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 3.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{signup.name}</p>
                    <p className="text-gray-400 text-sm">{signup.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-medium">{signup.time}</p>
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1 ml-auto" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 text-lg mb-6">
            Join the movement. Build your AI workforce today.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Join the Waitlist
          </motion.button>
        </motion.div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
};

export default TimerPage;
