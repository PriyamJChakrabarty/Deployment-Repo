Zudia - Your Meeting Co-pilot

Github : https://github.com/PriyamJChakrabarty/Zudia--Your-Meeting-Co-Pilot

Live Link : www.placeholder.com

Skills : Next.js, JavaScript, Web Workers, MongoDB

Created a Live Audio Capture Pipeline with WAV encode overhead at 2.32 ms - 21× under the 50 ms long-task ceiling across 1000 test chunks via PCM buffering and 16-bit mono serialization.

Used an inline Web Worker to offload WAV encoding, keeping main-thread stall at 0 ms across 160 chunk encodes, versus 45.73 ms blocking on the synchronous 60 s audio path.

Cut transcript re-renders by 99.9% — 3,600 naive updates to 1 flush per 180 s burst stream — by Debouncing ref-buffered updates at 500 ms and Throttling audio exports to one chunk per 3 s.


