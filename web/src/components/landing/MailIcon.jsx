import { motion } from "framer-motion"

export function MailIcon({ className = "" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* The Envelope Icon proper */}
      <div className="relative w-28 h-20 md:w-32 md:h-22 drop-shadow-2xl">
        
        {/* Subtle gradient background */}
        <div className="absolute inset-0 rounded-[0.8rem] overflow-hidden bg-[#0A0A0A] bg-gradient-to-br from-white/10 via-transparent to-white/5">
           {/* Gradient overlay to focus center */}
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
        </div>

        {/* Envelope Edges / Lines SVG */}
        <svg 
           className="absolute -inset-[1px] h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible" 
           viewBox="0 0 224 144" 
           fill="none" 
           xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Box Outline */}
          <rect x="0" y="0" width="224" height="144" rx="20" stroke="black" strokeWidth="6" className="opacity-80" />
          
          {/* The white reflective rim */}
          <rect x="0" y="0" width="224" height="144" rx="20" stroke="url(#paint0_linear)" strokeWidth="2" className="opacity-70" />
          
          {/* Envelope V Flap */}
          <path d="M4 16L112 88L220 16" stroke="black" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
          <path d="M4 16L112 88L220 16" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
          
          <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="224" y2="144" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0.8" />
              <stop offset="0.3" stopColor="white" stopOpacity="0.1" />
              <stop offset="0.7" stopColor="white" stopOpacity="0.1" />
              <stop offset="1" stopColor="white" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="112" y1="0" x2="112" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0.7" />
              <stop offset="1" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Minimal Animated Sheen */}
        <div className="absolute inset-0 rounded-[0.8rem] overflow-hidden pointer-events-none">
          <motion.div 
             initial={{ x: "-100%", skewX: -25 }}
             animate={{ x: "250%" }}
             transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
             className="w-1/2 h-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent absolute -top-1/2"
          />
        </div>
      </div>
    </div>
  )
}


