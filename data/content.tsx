
import React, { useEffect, useRef, useState } from 'react';
import { ModuleContent, Scene3D } from '../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart, CartesianGrid } from 'recharts';

// --- AUDIO ENGINE (Web Audio API) ---
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

const playHeartSound = (type: string, intensity: number = 1, duration: number = 0.1, timingOffset: number = 0) => {
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const t = audioCtx.currentTime + timingOffset;
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = Math.min(Math.max(intensity, 0), 1.0); 

  if (type === 'S1') {
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  } else if (type === 'S2') {
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  } else if (type === 'Click' || type === 'Snap') {
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(type === 'Snap' ? 350 : 600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  } else {
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    if (type === 'Harsh') { 
      filter.type = 'lowpass';
      filter.frequency.value = 400; 
      const shaper = audioCtx.createWaveShaper();
      shaper.curve = makeDistortionCurve(200);
      noise.connect(filter).connect(shaper).connect(gain);
    } else if (type === 'Blowing') {
      filter.type = 'highpass';
      filter.frequency.value = 800;
      noise.connect(filter).connect(gain);
    } else if (type === 'Rumble') {
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      filter.Q.value = 3;
      noise.connect(filter).connect(gain);
    } else {
        noise.connect(gain);
    }

    gain.connect(masterGain);
    gain.gain.setValueAtTime(0, t);
    
    if (type === 'Harsh') {
        gain.gain.linearRampToValueAtTime(1, t + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0, t + duration);
    } else if (type === 'Blowing' && duration > 0.3) {
        gain.gain.linearRampToValueAtTime(1, t + 0.05);
        gain.gain.setValueAtTime(1, t + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, t + duration);
    } else if (type === 'Blowing') {
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    } else if (type === 'Rumble') {
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.linearRampToValueAtTime(0, t + duration);
    }
    noise.start(t);
  }
};

const HeartSoundPlayer = ({ pathology, maneuver }: { pathology: string, maneuver: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const playSequence = () => {
    const S1_TIME = 0;
    const S2_TIME = 0.35; 
    
    let s1Vol = 1.0;
    let s2Vol = 1.0;
    const isValsalva = maneuver === 'Valsalva';
    const isSquat = maneuver === 'Squatting';

    if (pathology.includes('Mitral Stenosis')) s1Vol = 1.5;
    if (pathology.includes('Mitral Regurgitation') || pathology.includes('PR Interval')) s1Vol = 0.5;
    playHeartSound('S1', s1Vol, 0.1, S1_TIME);

    if (pathology.includes('Aortic Stenosis')) {
        const intensity = isValsalva ? 0.4 : (isSquat ? 0.9 : 0.7);
        playHeartSound('Harsh', intensity, 0.28, S1_TIME + 0.05);
        s2Vol = 0.3; 
    }
    if (pathology.includes('Mitral Regurgitation')) {
        const intensity = isValsalva ? 0.4 : (isSquat ? 0.9 : 0.7);
        playHeartSound('Blowing', intensity, 0.33, S1_TIME + 0.02);
    }
    if (pathology.includes('HOCM')) {
        const intensity = isValsalva ? 1.0 : (isSquat ? 0.3 : 0.6);
        playHeartSound('Harsh', intensity, 0.25, S1_TIME + 0.05);
    }
    if (pathology.includes('Prolapse')) {
        const clickTime = isValsalva ? 0.15 : (isSquat ? 0.28 : 0.20);
        playHeartSound('Click', 1.0, 0.05, S1_TIME + clickTime);
        playHeartSound('Blowing', 0.5, 0.35 - clickTime, S1_TIME + clickTime);
    }

    setTimeout(() => {
        playHeartSound('S2', s2Vol, 0.1, 0); 
        if (pathology.includes('ASD')) playHeartSound('S2', 0.8, 0.1, 0.05); 
    }, S2_TIME * 1000);

    const diastoleStart = S2_TIME;
    if (pathology.includes('Aortic Regurgitation')) {
        const intensity = isValsalva ? 0.3 : (isSquat ? 0.9 : 0.7);
        playHeartSound('Blowing', intensity, 0.4, diastoleStart + 0.05);
    }
    if (pathology.includes('Mitral Stenosis')) {
        const osTime = 0.08; 
        setTimeout(() => playHeartSound('Snap', 1.0, 0.05, 0), osTime * 1000);
        playHeartSound('Rumble', 0.6, 0.4, diastoleStart + osTime + 0.02);
    }
    if (pathology.includes('S3')) setTimeout(() => playHeartSound('S1', 0.4, 0.15, 0), 140); 
    if (pathology.includes('S4')) playHeartSound('S1', 0.4, 0.15, 0.9); 
  };

  useEffect(() => {
    if (isPlaying) {
      playSequence();
      timerRef.current = window.setInterval(playSequence, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); }
  }, [isPlaying, pathology, maneuver]);

  return (
    <button 
      onClick={() => setIsPlaying(!isPlaying)}
      className={`px-6 py-3 rounded-full font-bold text-white transition-all shadow-lg border-2 border-transparent ${isPlaying ? 'bg-red-600 border-red-300 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
    >
      <span className="flex items-center gap-2">
        {isPlaying ? '■ Stop Audio' : '▶ Play Audio'}
      </span>
    </button>
  );
};

// --- RENDERERS ---

const renderSoundSim: Scene3D['renderLogic'] = (state) => {
  const pathology = state['pathology'] as string;
  const maneuver = state['maneuver'] as string;

  return (
    <div className="flex flex-col items-center w-full h-full bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-700">
      <div className="w-full h-48 relative mb-6 bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="absolute inset-0 flex">
            <div className="w-[35%] border-r border-slate-600/50 h-full flex items-end justify-center pb-2"><span className="text-xs text-slate-500">Systole</span></div>
            <div className="w-[65%] h-full flex items-end justify-center pb-2"><span className="text-xs text-slate-500">Diastole</span></div>
        </div>
        <div className="absolute left-[2%] bottom-8 w-2 h-24 bg-blue-500 rounded"></div>
        <div className="absolute left-[2%] bottom-2 text-blue-400 font-bold text-xs">S1</div>
        <div className="absolute left-[35%] bottom-8 w-2 h-20 bg-blue-500 rounded"></div>
        <div className="absolute left-[35%] bottom-2 text-blue-400 font-bold text-xs">S2</div>

        {pathology.includes('Aortic Stenosis') && (
            <div className="absolute left-[6%] bottom-8 h-16 w-[28%] bg-gradient-to-t from-red-500/80 to-transparent" 
                 style={{ clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)', opacity: maneuver==='Valsalva' ? 0.5 : 1 }}></div>
        )}
        {pathology.includes('HOCM') && (
            <div className="absolute left-[6%] bottom-8 h-16 w-[28%] bg-gradient-to-t from-orange-500/80 to-transparent transition-all duration-300" 
                 style={{ clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)', opacity: maneuver==='Valsalva' ? 1 : 0.4, transform: maneuver==='Valsalva' ? 'scaleY(1.3)' : 'scaleY(0.7)' }}></div>
        )}
        {pathology.includes('Mitral Regurgitation') && (
            <div className="absolute left-[6%] bottom-8 h-16 w-[28%] bg-purple-500/60 rounded-t-sm" 
                 style={{ opacity: maneuver==='Valsalva' ? 0.5 : 1 }}></div>
        )}
        {pathology.includes('Prolapse') && (
            <>
                <div className="absolute bottom-8 w-1 h-12 bg-yellow-400 transition-all duration-300" 
                     style={{ left: maneuver==='Valsalva' ? '15%' : (maneuver==='Squatting' ? '25%' : '20%') }}></div>
                <div className="absolute bottom-8 h-12 bg-purple-500/60 transition-all duration-300"
                     style={{ 
                         left: maneuver==='Valsalva' ? '16%' : (maneuver==='Squatting' ? '26%' : '21%'),
                         width: maneuver==='Valsalva' ? '18%' : (maneuver==='Squatting' ? '8%' : '13%')
                     }}></div>
            </>
        )}
        {pathology.includes('Mitral Stenosis') && (
            <>
                <div className="absolute left-[42%] bottom-8 w-1 h-12 bg-yellow-400"></div> 
                <div className="absolute left-[42%] top-10 text-yellow-400 text-[10px] font-bold">OS</div>
                <div className="absolute left-[44%] bottom-8 h-12 w-[30%] bg-indigo-500/50" style={{clipPath: 'polygon(0 0, 100% 100%, 0 100%)'}}></div>
            </>
        )}
        {pathology.includes('Aortic Regurgitation') && (
            <div className="absolute left-[37%] bottom-8 h-16 w-[30%] bg-green-500/50" style={{clipPath: 'polygon(0 0, 100% 100%, 0 100%)'}}></div>
        )}
        {pathology.includes('S3') && (
            <div className="absolute left-[45%] bottom-8 w-2 h-12 bg-slate-400 rounded"></div>
        )}
        {pathology.includes('S4') && (
            <div className="absolute left-[90%] bottom-8 w-2 h-12 bg-slate-400 rounded"></div>
        )}
      </div>
      <HeartSoundPlayer pathology={pathology} maneuver={maneuver} />
    </div>
  );
};

const renderPulseSim: Scene3D['renderLogic'] = (state) => {
  const pulseType = state['pulseType'] as string;
  const data = [];
  for(let i=0; i<=40; i++) {
    let val = 0;
    const x = i/40; 
    if (pulseType === 'Normal') val = (Math.sin(x * Math.PI) * 100) * Math.exp(-2*x) + (i>20 ? 10*Math.exp(-5*(x-0.6)):0);
    if (pulseType.includes('Parvus')) val = (Math.sin((x-0.1) * Math.PI) * 50) * Math.exp(-1.5*x);
    if (pulseType.includes('Bounding')) val = (Math.sin(x * Math.PI) * 140) * Math.exp(-4*x);
    if (pulseType.includes('Bisferiens')) val = (Math.sin(x * Math.PI * 2.2) * 50) + (Math.sin(x * Math.PI * 0.8) * 70);
    if (val < 0) val = 0;
    data.push({time: i, value: val});
  }

  return (
    <div className="w-full h-64 bg-white rounded-xl border border-slate-200 p-4 shadow-inner">
        <h4 className="text-center text-sm font-bold text-slate-700 mb-2">{pulseType}</h4>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fee2e2" strokeWidth={3} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
};

const renderMorphologySim: Scene3D['renderLogic'] = (state) => {
    const condition = state['condition'] as string;
    const lead = state['lead'] as string;
    let path = "";
    let qrsDesc = "";

    if (lead === 'V1') {
        if (condition === 'Normal') { path = "M0,30 L10,30 L12,25 L15,35 L20,30 L30,30"; qrsDesc = "Small r, small s (or QS)"; }
        if (condition === 'RBBB') { path = "M0,30 L10,30 L12,15 L14,30 L16,10 L20,35 L25,30 L40,30"; qrsDesc = "rSR' (Rabbit Ears). Delayed RV activation."; }
        if (condition === 'LBBB') { path = "M0,30 L10,30 L15,55 L25,30 L40,30"; qrsDesc = "Deep, broad QS complex."; }
        if (condition === 'RVH') { path = "M0,30 L10,30 L15,5 L20,35 L25,30 L40,30"; qrsDesc = "Tall R wave (>S wave)."; }
        if (condition === 'STEMI (Ant)') { path = "M0,30 L10,30 L15,50 L20,10 L25,5 L35,5 L45,20 L55,30"; qrsDesc = "QS wave + Marked ST Elevation."; }
    } else { 
        if (condition === 'Normal') { path = "M0,30 L10,30 L12,32 L15,10 L18,32 L25,30 L35,25 L45,30"; qrsDesc = "Tiny q, Tall R."; }
        if (condition === 'RBBB') { path = "M0,30 L10,30 L12,32 L15,10 L18,35 L25,35 L30,30"; qrsDesc = "Slurred S wave."; }
        if (condition === 'LBBB') { path = "M0,30 L10,30 L15,5 L20,5 L25,15 L35,30"; qrsDesc = "Broad, monomorphic R wave. No q."; }
        if (condition === 'LVH') { path = "M0,30 L10,30 L15,35 L20,-10 L25,35 L30,30 L40,35 L50,30"; qrsDesc = "Very Tall R wave + Strain pattern."; }
    }

    return (
        <div className="w-full bg-pink-50 p-6 rounded border border-pink-200 shadow-md relative">
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ backgroundImage: 'linear-gradient(#f472b6 1px, transparent 1px), linear-gradient(90deg, #f472b6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <h3 className="text-center font-bold text-red-900 mb-6">{condition} in Lead {lead}</h3>
            <div className="h-40 relative flex items-center justify-center">
                <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                    <path d={path} fill="none" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
            </div>
            <div className="mt-4 bg-white/80 p-3 rounded text-sm border border-red-100">
                <strong>Morphology:</strong> {qrsDesc}
            </div>
        </div>
    );
};

const renderPericardialSim: Scene3D['renderLogic'] = (state) => {
    const condition = state['condition'] as string;
    const data = [];
    for(let i=0; i<=60; i++) {
        const t = i/60;
        let lv = 0, rv = 0;
        if (condition === 'Normal') {
            if (t < 0.3) { lv = 120 * Math.sin(t/0.3 * Math.PI); rv = 25 * Math.sin(t/0.3 * Math.PI); } 
            else { lv = 5 + (t-0.3)*10; rv = 2 + (t-0.3)*5; } 
        }
        if (condition === 'Tamponade') {
            if (t < 0.3) { lv = 100 * Math.sin(t/0.3 * Math.PI); rv = 25 * Math.sin(t/0.3 * Math.PI); }
            else { lv = 18; rv = 18; } 
        }
        if (condition === 'Constriction') {
            if (t < 0.3) { lv = 110 * Math.sin(t/0.3 * Math.PI); rv = 30 * Math.sin(t/0.3 * Math.PI); }
            else { 
                const diastolicT = t - 0.3;
                if (diastolicT < 0.1) { lv = 2; rv = 2; } 
                else { lv = 15; rv = 15; } 
            }
        }
        data.push({ t: i, lv, rv });
    }

    return (
        <div className="w-full h-80 bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col">
            <h3 className="text-slate-300 text-center mb-2 font-mono">{condition} Pressure Tracing</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis hide />
                    <YAxis domain={[0, 130]} hide />
                    <Line type="monotone" dataKey="lv" stroke="#ef4444" strokeWidth={2} dot={false} name="LV" />
                    <Line type="monotone" dataKey="rv" stroke="#3b82f6" strokeWidth={2} dot={false} name="RV" />
                </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="text-red-500 font-bold">● LV Pressure</span>
                <span className="text-blue-500 font-bold">● RV Pressure</span>
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">
                {condition === 'Tamponade' && "Note Diastolic Equalization of Pressures."}
                {condition === 'Constriction' && "Note 'Dip and Plateau' (Square Root Sign)."}
            </div>
        </div>
    );
};

const renderECGSim: Scene3D['renderLogic'] = (state) => {
  const angle = state['axis'] as number;
  
  // Radian helper
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Projection amplitude based on cosine of angle difference
  const projection = (axisAngle: number, leadAngle: number) => Math.cos(rad(axisAngle - leadAngle));
  
  const leads = [
      { name: 'I', angle: 0, color: '#ef4444' },
      { name: 'II', angle: 60, color: '#ef4444' },
      { name: 'III', angle: 120, color: '#ef4444' },
      { name: 'aVR', angle: -150, color: '#3b82f6' }, // -150 = 210 degrees
      { name: 'aVL', angle: -30, color: '#3b82f6' }, // -30 = 330 degrees
      { name: 'aVF', angle: 90, color: '#3b82f6' },
  ];

  // Helper to draw a realistic QRS complex based on amplitude (-1 to 1)
  // ViewBox: 0 0 40 60. Baseline y=30.
  const getECGPath = (amp: number) => {
      const pHeight = 3; // P wave amplitude
      const tHeight = 6; // T wave amplitude
      
      // Base points
      let path = "M0,30 L5,30"; // Start
      
      // P wave (always upright in II, varies elsewhere but keep simple for vector concept)
      // Let's make P wave follow vector roughly but smaller
      const pAmp = amp * pHeight;
      path += ` Q7,${30-pAmp} 9,30`;
      
      // PR segment
      path += " L12,30";
      
      // QRS Complex
      const rHeight = amp * 25; // Max height 25 units
      
      if (amp > 0.2) {
          // Positive dominant (qRs)
          path += ` L13,31 L18,${30-rHeight} L22,32 L24,30`; 
      } else if (amp < -0.2) {
          // Negative dominant (rS)
          path += ` L13,28 L18,${30 + Math.abs(rHeight)} L22,28 L24,30`;
      } else {
          // Equiphasic (RS)
          path += ` L13,25 L18,35 L24,30`;
      }
      
      // ST segment
      path += " L28,30";
      
      // T wave (Concordant with QRS usually)
      const tAmp = amp * tHeight;
      path += ` Q32,${30-tAmp} 36,30`;
      
      // End
      path += " L40,30";
      
      return path;
  };

  let interp = "Normal Axis";
  let zoneColor = "bg-green-500/20 text-green-400";
  
  if (angle > -30 && angle < 90) { 
      interp = "Normal Axis"; 
      zoneColor = "bg-green-500/20 text-green-400";
  } else if (angle <= -30 && angle >= -90) { 
      interp = "Left Axis Deviation"; 
      zoneColor = "bg-yellow-500/20 text-yellow-400";
  } else if (angle >= 90 && angle <= 180) { 
      interp = "Right Axis Deviation"; 
      zoneColor = "bg-orange-500/20 text-orange-400";
  } else { 
      interp = "Extreme Axis Deviation"; 
      zoneColor = "bg-red-500/20 text-red-400";
  }

  // Vector Arrow Endpoint
  const x = 50 + 42 * Math.cos(rad(angle));
  const y = 50 + 42 * Math.sin(rad(angle));

  // Legend Data
  const quadrants = [
    { name: "Normal Axis", range: "-30° to +90°", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", active: angle > -30 && angle < 90, description: "Normal physiology." },
    { name: "Left Axis Deviation", range: "-30° to -90°", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", active: angle <= -30 && angle >= -90, description: "LVH, LBBB, Inferior MI, LAFB." },
    { name: "Right Axis Deviation", range: "+90° to +180°", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", active: angle >= 90 && angle <= 180, description: "RVH, LPHB, Lateral MI, PE." },
    { name: "Extreme Axis", range: "-90° to -180°", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", active: angle < -90 || angle > 180, description: "VT, Hyperkalemia, Lead Error." }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl border border-slate-700 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row h-full gap-8">
            {/* Left: The Cabrera Circle */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className={`font-bold mb-6 text-xl text-center px-6 py-2 rounded-full border border-white/10 ${zoneColor}`}>
                    {interp} ({angle}°)
                </div>
                <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        {/* Background & Zones */}
                        <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                        
                        {/* Normal Zone (-30 to +90) */}
                        <path d="M50,50 L84.6,30 A40,40 0 0,1 50,90 L50,50" fill="#22c55e" fillOpacity="0.1" />
                        
                        {/* LAD Zone (-30 to -90) */}
                        <path d="M50,50 L50,10 A40,40 0 0,1 84.6,30 L50,50" fill="#eab308" fillOpacity="0.1" />
                        
                        {/* RAD Zone (+90 to +180) */}
                        <path d="M50,50 L50,90 A40,40 0 0,1 10,50 L50,50" fill="#f97316" fillOpacity="0.1" />
                        
                        {/* Extreme Zone (-90 to -180) */}
                        <path d="M50,50 L10,50 A40,40 0 0,1 50,10 L50,50" fill="#ef4444" fillOpacity="0.1" />

                        {/* Lead Lines & Labels */}
                        {leads.map(l => {
                            const lx = 50 + 52 * Math.cos(rad(l.angle));
                            const ly = 50 + 52 * Math.sin(rad(l.angle));
                            return (
                                <g key={l.name}>
                                    <line x1="50" y1="50" x2={lx} y2={ly} stroke={l.color} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5" />
                                    <circle cx={lx} cy={ly} r="3.5" fill="#0f172a" stroke={l.color} strokeWidth="1.5" />
                                    <text x={lx} y={ly} dy="1.2" fontSize="3" fill="white" textAnchor="middle" alignmentBaseline="middle" fontWeight="bold">{l.name}</text>
                                    <text x={lx} y={ly} dy="5" fontSize="2" fill="#94a3b8" textAnchor="middle" alignmentBaseline="middle">{l.angle}°</text>
                                </g>
                            );
                        })}

                        {/* The Vector Arrow */}
                        <line x1="50" y1="50" x2={x} y2={y} stroke="white" strokeWidth="2.5" markerEnd="url(#arrow)" />
                        <circle cx="50" cy="50" r="3" fill="white" />
                        <defs>
                            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                                <path d="M0,0 L8,4 L0,8 z" fill="white" />
                            </marker>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* Right: Real-time 6-Lead ECG & Legend */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
                    <h4 className="text-slate-300 text-xs font-bold uppercase mb-4 text-center tracking-widest">Real-time Limb Lead Projection</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        {leads.map(l => {
                            const amplitude = projection(angle, l.angle);
                            return (
                                <div key={l.name} className="relative bg-[#fff0f5] rounded h-16 border border-pink-200/50 shadow-sm overflow-hidden group hover:scale-105 transition-transform duration-200">
                                    {/* ECG Grid Background */}
                                    <div className="absolute inset-0 opacity-20" 
                                         style={{ backgroundImage: 'linear-gradient(#f472b6 0.5px, transparent 0.5px), linear-gradient(90deg, #f472b6 0.5px, transparent 0.5px)', backgroundSize: '4px 4px' }}></div>
                                    <div className="absolute inset-0 opacity-20" 
                                         style={{ backgroundImage: 'linear-gradient(#f472b6 1px, transparent 1px), linear-gradient(90deg, #f472b6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                    
                                    <div className="absolute top-1 left-2 text-[10px] font-bold text-slate-800 bg-white/80 px-1 rounded">{l.name}</div>
                                    
                                    <svg viewBox="0 0 40 60" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                        <path d={getECGPath(amplitude)} fill="none" stroke="black" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                                    </svg>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Interactive Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quadrants.map((q) => (
                        <div key={q.name} className={`p-2 rounded border transition-all duration-300 ${q.active ? `${q.bg} ${q.border} shadow-md ring-1 ring-inset ring-white/10` : "bg-slate-800 border-slate-700 opacity-60"}`}>
                            <div className={`font-bold text-[10px] uppercase ${q.color}`}>{q.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{q.range}</div>
                            <div className="text-[9px] text-slate-300 mt-0.5 leading-tight">{q.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

const renderCongenitalSim: Scene3D['renderLogic'] = (state) => {
    const shunt = state['shunt'] as string;
    
    // O2 Sats
    let svc = 70, ivc = 70;
    let ra = 75, rv = 75, pa = 75;
    let la = 98, lv = 98, ao = 98;
    let shuntQpQs = 1.0;
    
    if (shunt === 'ASD') { 
        ra = 88; rv = 88; pa = 88; 
        shuntQpQs = 2.0; // Significant L->R
    }
    if (shunt === 'VSD') { 
        ra = 75; rv = 88; pa = 88; 
        shuntQpQs = 2.0;
    }
    if (shunt === 'PDA') { 
        ra = 75; rv = 75; pa = 88; 
        shuntQpQs = 1.5;
    }

    const Box = ({ label, val, hl }: any) => (
        <div className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 shadow-md w-28 h-24 transition-all duration-500 ${hl ? 'bg-red-50 border-red-500 scale-110 z-10 shadow-red-200' : 'bg-white border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">{label}</span>
            <span className={`text-3xl font-mono font-bold ${val > 90 ? 'text-red-500' : 'text-blue-500'}`}>{val}%</span>
            {hl && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full mt-1 font-bold animate-pulse">STEP UP</span>}
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 p-8 rounded-xl border border-slate-200">
             <div className="flex justify-center items-center mb-8 relative gap-16">
                 {/* Right Heart Column */}
                 <div className="flex flex-col gap-6 items-center relative">
                     <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-300 tracking-[0.5em]">VENOUS</div>
                     <Box label="SVC/IVC" val={svc} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-blue-200"></div>
                     <Box label="Right Atrium" val={ra} hl={shunt==='ASD'} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-blue-200"></div>
                     <Box label="Right Ventricle" val={rv} hl={shunt==='VSD'} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-blue-200"></div>
                     <Box label="Pulm Artery" val={pa} hl={shunt==='PDA'} />
                 </div>
                 
                 {/* Shunt Arrows (Visual only) */}
                 <div className="h-96 w-24 flex flex-col justify-center items-center opacity-50">
                    {shunt === 'ASD' && <div className="w-full h-1 bg-red-400 animate-pulse relative top-[-40px]"><div className="absolute right-0 -top-1 border-4 border-transparent border-l-red-400"></div></div>}
                    {shunt === 'VSD' && <div className="w-full h-1 bg-red-400 animate-pulse relative top-[40px]"><div className="absolute right-0 -top-1 border-4 border-transparent border-l-red-400"></div></div>}
                 </div>

                 {/* Left Heart Column */}
                 <div className="flex flex-col gap-6 items-center relative">
                     <div className="absolute -right-12 top-1/2 -translate-y-1/2 rotate-90 text-xs font-bold text-red-300 tracking-[0.5em]">ARTERIAL</div>
                     <Box label="Pulm Veins" val={98} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-red-200"></div>
                     <Box label="Left Atrium" val={la} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-red-200"></div>
                     <Box label="Left Ventricle" val={lv} />
                     <div className="h-8 w-0.5 border-l-2 border-dashed border-red-200"></div>
                     <Box label="Aorta" val={ao} />
                 </div>
             </div>

             <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-white flex justify-between items-center shadow-lg">
                 <div>
                     <h4 className="text-xs text-slate-400 font-bold uppercase mb-1">Diagnostic Calculation</h4>
                     <div className="text-xl font-bold text-yellow-400">
                         {shunt === 'None' ? 'Normal Physiology' : `Significant ${shunt} Detected`}
                     </div>
                 </div>
                 <div className="text-right">
                     <div className="text-xs text-slate-400 font-bold uppercase mb-1">Qp/Qs Ratio</div>
                     <div className="text-3xl font-mono font-bold text-green-400">{shuntQpQs.toFixed(1)} : 1</div>
                     <div className="text-[10px] text-slate-500 mt-1">Normal = 1.0. Surgery if &gt; 1.5</div>
                 </div>
             </div>
        </div>
    );
};

const renderShockSim: Scene3D['renderLogic'] = (state) => {
    const ci = state['ci'] as number;
    const pcwp = state['pcwp'] as number;
    
    const isWet = pcwp > 18;
    const isCold = ci < 2.2;
    
    let label = "Warm & Dry";
    let sub = "Normal / Compensated";
    let tx = "Optimize oral meds";
    let bg = "bg-green-100 text-green-800";
    
    if (isWet && !isCold) { 
        label = "Warm & Wet"; 
        sub = "Pulmonary Edema"; 
        tx = "Diuretics + Vasodilators";
        bg = "bg-yellow-100 text-yellow-800"; 
    }
    else if (!isWet && isCold) { 
        label = "Cold & Dry"; 
        sub = "Hypovolemic / Low Output"; 
        tx = "Fluids (careful) or Inotrope";
        bg = "bg-blue-100 text-blue-800"; 
    }
    else if (isWet && isCold) { 
        label = "Cold & Wet"; 
        sub = "Cardiogenic Shock"; 
        tx = "Inotropes + Diuretics + Mechanical Support";
        bg = "bg-red-100 text-red-800"; 
    }
    
    const xPos = Math.min(Math.max((pcwp / 35) * 100, 0), 100); 
    const yPos = Math.min(Math.max(100 - ((ci - 1) / 3) * 100, 0), 100);

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 bg-white border border-slate-300 rounded mb-4 overflow-hidden min-h-[250px] shadow-inner">
                <div className="absolute top-0 bottom-0 left-[51%] border-l-2 border-dashed border-slate-400 z-0"></div> 
                <div className="absolute left-0 right-0 top-[60%] border-t-2 border-dashed border-slate-400 z-0"></div>
                
                <div className="absolute top-2 left-2 text-xs font-bold text-slate-400 bg-white/80 px-1 rounded">WARM & DRY</div>
                <div className="absolute top-2 right-2 text-xs font-bold text-yellow-600 bg-yellow-50 px-1 rounded">WARM & WET</div>
                <div className="absolute bottom-2 left-2 text-xs font-bold text-blue-600 bg-blue-50 px-1 rounded">COLD & DRY</div>
                <div className="absolute bottom-2 right-2 text-xs font-bold text-red-600 bg-red-50 px-1 rounded">COLD & WET</div>
                
                <div 
                    className="absolute w-6 h-6 bg-indigo-600 border-4 border-white rounded-full shadow-xl transition-all duration-300 z-10 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ left: `${xPos}%`, top: `${yPos}%` }}
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
            </div>
            
            <div className={`p-4 rounded-lg flex items-center justify-between ${bg} transition-colors duration-300 shadow-md border border-black/5`}>
                <div>
                    <div className="font-bold text-lg">{label}</div>
                    <div className="text-sm opacity-90 font-semibold">{sub}</div>
                    <div className="text-xs mt-1 opacity-75 bg-white/40 inline-block px-2 py-0.5 rounded">Rx: {tx}</div>
                </div>
                <div className="text-right text-xs font-mono opacity-80 bg-white/40 p-2 rounded border border-black/5">
                    CI: {ci} L/min/m²<br/>PCWP: {pcwp} mmHg
                </div>
            </div>
        </div>
    );
};

// --- FULLY EXPANDED COURSE CONTENT ---

export const courseContent: ModuleContent[] = [
  {
    id: "mod1",
    title: "Module 1: Physical Examination",
    overview: [
      "Carotid Pulse: Parvus et Tardus (AS), Bounding (AR/PDA), Bisferiens (HOCM/AR).",
      "Pulsus Paradoxus: >10mmHg drop in SBP with inspiration (Tamponade, Asthma).",
      "JVP: Reflects RA Pressure. Normal < 8cm H2O. 'a' wave = atrial contraction.",
      "Kussmaul Sign: Paradoxical RISE in JVP with inspiration (Constriction, RV Infarct).",
      "Apical Impulse: Sustained (Pressure/LVH), Displaced (Volume/Dilated)."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Carotid Artery Pulse Analysis</h3>
      <p class="mb-4 text-lg">The carotid pulse is the most accurate representation of the central aortic pulse.
      <ul class="list-disc pl-6 space-y-3 mb-6">
        <li><strong>Pulsus Parvus et Tardus:</strong> Weak (parvus) and delayed (tardus) upstroke. <span class="text-red-600 font-bold">Mechanism:</span> Fixed obstruction (Severe Aortic Stenosis) slows ventricular ejection.</li>
        <li><strong>Bounding (Hyperkinetic/Water-Hammer):</strong> Rapid upstroke and rapid collapse. <span class="text-red-600 font-bold">Causes:</span> Aortic Regurgitation (large stroke volume + diastolic runoff), PDA, High output states (Thyrotoxicosis, Fever, Anemia).</li>
        <li><strong>Pulsus Bisferiens:</strong> Two systolic peaks. <span class="text-red-600 font-bold">Causes:</span> HOCM (mid-systolic obstruction creates a notch), or mixed AS/AR.</li>
        <li><strong>Pulsus Alternans:</strong> Beat-to-beat variation in amplitude with regular rhythm. <span class="text-red-600 font-bold">Significance:</span> Severe Left Ventricular Failure (Systolic Dysfunction).</li>
        <li><strong>Pulsus Paradoxus:</strong> Exaggerated drop in SBP (>10 mmHg) during inspiration. <span class="text-red-600 font-bold">Mechanism:</span> Ventricular Interdependence. In Tamponade, the RV expands during inspiration (increased venous return) into the septum, compressing the LV and reducing cardiac output. Also seen in severe Asthma/COPD (intrathoracic pressure swings).</li>
      </ul>
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Jugular Venous Pulsation (JVP)</h3>
      <p class="mb-4 text-lg">
      The JVP assesses Right Atrial pressure and function.
      <br/><br/>
      <strong>Waveform Components:</strong>
      <ul class="list-disc pl-6 space-y-2 mb-4">
        <li><strong>a wave:</strong> Atrial Contraction. (Presystolic).</li>
        <li><strong>c wave:</strong> Tricuspid closure/Carotid impact.</li>
        <li><strong>x descent:</strong> Atrial relaxation.</li>
        <li><strong>v wave:</strong> Passive atrial filling during systole.</li>
        <li><strong>y descent:</strong> Early rapid ventricular filling (Diastolic).</li>
      </ul>
      
      <strong>Pathological Abnormalities:</strong>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Large 'a' wave:</strong> Resistance to atrial emptying (Tricuspid Stenosis, Pulmonary Hypertension, RVH).</li>
        <li><strong>Cannon 'a' wave:</strong> Atrium contracts against a closed Tricuspid valve. Seen in <strong>Complete Heart Block (AV Dissociation)</strong> or VT.</li>
        <li><strong>Absent 'a' wave:</strong> Atrial Fibrillation (no organized contraction).</li>
        <li><strong>Large 'v' wave:</strong> Tricuspid Regurgitation (systolic jet fills RA). aka "Lancet wave".</li>
        <li><strong>Steep 'y' descent:</strong> Rapid emptying into a stiff/constricted ventricle (Constrictive Pericarditis).</li>
        <li><strong>Slow 'y' descent:</strong> Tricuspid Stenosis.</li>
      </ul>
      </p>
    `,
    detailedContent: `
      <h3>Carotid Artery Pulse</h3>
      <ul>
        <li><strong>Pulsus Parvus:</strong> Weak upstroke due to decreased stroke volume (hypovolemia, LV failure, aortic or mitral stenosis).</li>
        <li><strong>Pulsus Tardus:</strong> Delayed upstroke (aortic stenosis).</li>
        <li><strong>Bounding Pulse:</strong> Hyperkinetic circulation, aortic regurgitation, patent ductus arteriosus, marked vasodilation.</li>
        <li><strong>Pulsus Bisferiens:</strong> Double systolic pulsation (aortic regurgitation, hypertrophic cardiomyopathy).</li>
        <li><strong>Pulsus Alternans:</strong> Regular alteration in pulse pressure amplitude (severe LV dysfunction).</li>
        <li><strong>Pulsus Paradoxus:</strong> Exaggerated inspiratory fall (>10 mmHg) in systolic BP (typical of pericardial tamponade; also seen in severe obstructive lung disease, massive pulmonary embolism, tension pneumothorax).</li>
      </ul>

      <h3>Jugular Venous Pulsation (JVP)</h3>
      <p>Jugular venous distention develops in right-sided heart failure, constrictive pericarditis, pericardial tamponade, obstruction of superior vena cava. JVP normally falls with inspiration but may rise (Kussmaul sign) in constrictive pericarditis.</p>
      <ul>
        <li><strong>Large "a" wave:</strong> Tricuspid stenosis, pulmonic stenosis, AV dissociation (RA contracts against closed tricuspid valve).</li>
        <li><strong>Absent "a" wave:</strong> Atrial fibrillation.</li>
        <li><strong>Large "v" wave:</strong> Tricuspid regurgitation, atrial septal defect.</li>
        <li><strong>Steep "y" descent:</strong> Constrictive pericarditis.</li>
        <li><strong>Slow "y" descent:</strong> Tricuspid stenosis.</li>
      </ul>

      <h3>Precordial Palpation</h3>
      <ul>
        <li><strong>Forceful apical thrust:</strong> Left ventricular hypertrophy.</li>
        <li><strong>Lateral/Downward displacement:</strong> Left ventricular dilatation.</li>
        <li><strong>Prominent presystolic impulse:</strong> Hypertension, AS, HOCM (corresponds to S4).</li>
        <li><strong>Double systolic apical impulse:</strong> Hypertrophic cardiomyopathy.</li>
        <li><strong>Sustained "lift" at lower left sternal border:</strong> Right ventricular hypertrophy.</li>
        <li><strong>Dyskinetic impulse:</strong> Ventricular aneurysm, large dyskinetic area post MI.</li>
      </ul>
    `,
    visuals: [],
    scenes: [
      {
        id: "pulse_sim",
        title: "Arterial Pulse Morphology",
        description: "Observe the arterial pressure waveform changes associated with valvular and myocardial pathology.",
        objects: ["Graph"],
        controls: [
          { id: 'pulseType', label: 'Pulse Type', type: 'select', options: ['Normal', 'Parvus et Tardus (AS)', 'Bounding (AR)', 'Bisferiens (HOCM)'], defaultValue: 'Normal' }
        ],
        learningOutcome: "Identify the hemodynamic correlates of physical exam findings.",
        renderLogic: renderPulseSim
      }
    ],
    tables: [
      {
        title: "JVP vs Carotid Pulse",
        content: [
          ["Feature", "JVP", "Carotid"],
          ["Character", "Biphasic (double flicker)", "Monophasic (single thrust)"],
          ["Palpable?", "No (visible only)", "Yes"],
          ["Occludable?", "Yes (light pressure)", "No"],
          ["Position Effect", "Drops when sitting up", "Unchanged"],
          ["Respiration", "Drops with inspiration", "Unchanged (usually)"]
        ]
      }
    ],
    quiz: [
      { id: 1, question: "A patient has a JVP that RISES with inspiration. This is known as:", options: ["Pulsus Paradoxus", "Kussmaul Sign", "Cannon a-wave", "Lancet wave"], correctIndex: 1, explanation: "Kussmaul sign is a paradoxical rise in JVP during inspiration. Normally, inspiration sucks blood into the heart, lowering JVP. In Constrictive Pericarditis or RV Infarction, the RV cannot accept the volume, so it backs up into the neck." },
      { id: 2, question: "Cannon 'a' waves in the neck are most specific for:", options: ["Atrial Fibrillation", "Tricuspid Regurgitation", "AV Dissociation (Complete Heart Block)", "Tamponade"], correctIndex: 2, explanation: "Cannon a-waves occur when the RA contracts against a closed Tricuspid valve. This requires the atria and ventricles to be beating independently (AV dissociation)." },
      { id: 3, question: "Pulsus bisferiens is most commonly associated with:", options: ["Aortic Stenosis", "Hypertrophic Cardiomyopathy", "Mitral Regurgitation", "Mitral Stenosis"], correctIndex: 1, explanation: "Pulsus bisferiens (double peak) occurs in HOCM (spike-and-dome) and mixed Aortic Stenosis/Regurgitation." },
      { id: 4, question: "A sustained, forceful apical impulse is most indicative of:", options: ["Pressure Overload (LVH)", "Volume Overload (Dilated CM)", "Mitral Stenosis", "Constrictive Pericarditis"], correctIndex: 0, explanation: "A sustained heave indicates the LV is contracting against high pressure (Pressure Overload), typical of concentric LVH or severe AS." },
      { id: 5, question: "Large 'v' waves in the JVP are pathognomonic for:", options: ["Tricuspid Stenosis", "Tricuspid Regurgitation", "Pulmonic Stenosis", "ASD"], correctIndex: 1, explanation: "Large v waves (Lancet waves) occur when the RV pumps blood backwards into the RA during systole, filling the atrium excessively." },
      { id: 6, question: "Which condition causes a Pulsus Parvus et Tardus?", options: ["Aortic Regurgitation", "Aortic Stenosis", "Mitral Regurgitation", "Hypertrophic Cardiomyopathy"], correctIndex: 1, explanation: "Fixed obstruction of the aortic valve delays the systolic peak (tardus) and reduces amplitude (parvus)." },
      { id: 7, question: "The 'x' descent in the JVP corresponds to:", options: ["Atrial contraction", "Atrial relaxation", "Ventricular filling", "Passive atrial filling"], correctIndex: 1, explanation: "The x descent represents atrial relaxation and the downward pull of the tricuspid valve during systole." },
      { id: 8, question: "Hepatojugular reflux is a sign of:", options: ["Liver Failure", "Right Heart Failure", "Portal Hypertension", "Nephrotic Syndrome"], correctIndex: 1, explanation: "Sustained elevation of JVP >3cm with abdominal compression indicates the RV cannot accommodate increased venous return (Right Heart Failure)." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod2",
    title: "Module 2: Heart Sounds & Murmurs",
    overview: [
      "S1: Mitral/Tricuspid closure. Loud in MS. Soft in MR.",
      "S2: A2/P2 closure. Fixed Split = ASD. Paradoxical Split = LBBB/Severe AS.",
      "S3: Rapid Filling (Volume Overload/Failure). S4: Atrial Kick (Stiff LV/Pressure Overload).",
      "AS: Diamond shaped, radiates to carotids. MR: Holosystolic, radiates to axilla.",
      "Dynamic Auscultation: Valsalva makes HOCM/MVP louder/earlier. Squatting makes AS/MR/AR louder."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Heart Sounds (S1 & S2)</h3>
      <p class="mb-4 text-lg">
      <strong>S1 (M1+T1):</strong> Closure of AV valves.
      <br/>- <strong>Loud S1:</strong> Mitral Stenosis (leaflets are held open by gradient then snap shut), Short PR interval, Hyperdynamic states.
      <br/>- <strong>Soft S1:</strong> Mitral Regurgitation (poor coaptation), Long PR (leaflets drift shut).
      <br/><br/>
      <strong>S2 (A2+P2):</strong> Closure of Semilunar valves.
      <br/>- <strong>Normal Splitting:</strong> A2 then P2. Increases with Inspiration (negative intrathoracic pressure pulls blood into RV -> prolongs RV ejection -> delays P2).
      <br/>- <strong>Wide Splitting:</strong> Delayed P2 (RBBB, Pulmonic Stenosis) or Early A2 (MR).
      <br/>- <strong>Fixed Splitting:</strong> ASD. Continuous L->R shunt keeps RV volume overloaded in both inspiration and expiration.
      <br/>- <strong>Paradoxical (Reversed) Splitting:</strong> P2 <em>before</em> A2. Occurs when LV ejection is delayed (LBBB, Severe AS). Splitting <em>narrows</em> with inspiration.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Extra Sounds (S3 & S4)</h3>
      <p class="mb-4 text-lg">
      Best heard with Bell at Apex (Left Lateral Decubitus).
      <br/>- <strong>S3 (Ventricular Gallop):</strong> Occurs in early diastole during rapid passive filling.
      <br/>  <em>Causes:</em> Normal in children/pregnancy. Pathologic in adults >35 (Systolic HF, Dilated Cardiomyopathy, Severe MR). "Ken-tuc-ky".
      <br/>- <strong>S4 (Atrial Gallop):</strong> Occurs in late diastole (presystole) during atrial kick.
      <br/>  <em>Causes:</em> Blood striking a <strong>stiff, non-compliant LV</strong> (LVH, AS, Acute MI, HOCM). NEVER present in Atrial Fibrillation. "Ten-nes-see".
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Key Murmurs & Maneuvers</h3>
      <p class="text-lg">
      <strong>Aortic Stenosis (AS):</strong> Harsh, crescendo-decrescendo, R 2nd ICS. Radiates to carotids. Late-peaking = Severe.
      <br/><strong>Mitral Regurgitation (MR):</strong> Blowing, holosystolic, Apex. Radiates to axilla.
      <br/><strong>Mitral Stenosis (MS):</strong> Opening Snap (OS) + Diastolic Rumble. <em>Shorter A2-OS interval = Higher LA pressure = More Severe.</em>
      <br/><br/>
      <strong>MANEUVERS (High Yield):</strong>
      <br/>- <strong>Valsalva / Standing (↓ Preload):</strong> Most murmurs decrease. <strong>EXCEPT:</strong> HOCM (louder) and MVP (Click moves earlier).
      <br/>- <strong>Squatting / Leg Raise (↑ Preload):</strong> Most murmurs get louder (AS, MR, AR). HOCM gets softer. MVP click moves later.
      <br/>- <strong>Handgrip (↑ Afterload):</strong> Regurgitant murmurs (AR, MR, VSD) get louder. AS gets softer (gradient decreases).
      </p>
    `,
    detailedContent: `
      <h3>S1 (First Heart Sound)</h3>
      <ul>
        <li><strong>Loud:</strong> Mitral Stenosis, short PR interval, hyperkinetic heart, thin chest wall.</li>
        <li><strong>Soft:</strong> Long PR interval, heart failure, mitral regurgitation, thick chest wall, pulmonary emphysema.</li>
      </ul>

      <h3>S2 (Second Heart Sound)</h3>
      <p>Normally A2 precedes P2 and splitting increases with inspiration.</p>
      <ul>
        <li><strong>Widened Splitting:</strong> Right bundle branch block, Pulmonic Stenosis, Mitral Regurgitation.</li>
        <li><strong>Fixed Splitting:</strong> Atrial Septal Defect (no respiratory change).</li>
        <li><strong>Narrow Splitting:</strong> Pulmonary hypertension.</li>
        <li><strong>Paradoxical Splitting (Narrows with inspiration):</strong> Left bundle branch block, Heart Failure, Aortic Stenosis.</li>
        <li><strong>Loud A2:</strong> Systemic hypertension.</li>
        <li><strong>Soft A2:</strong> Aortic stenosis.</li>
        <li><strong>Loud P2:</strong> Pulmonary arterial hypertension.</li>
      </ul>

      <h3>S3 (Ventricular Gallop)</h3>
      <p>Low-pitched, heard best with bell at apex, following S2. Normal in children. After age 30–35, indicates LV failure or volume overload.</p>

      <h3>S4 (Atrial Gallop)</h3>
      <p>Low-pitched, heard best with bell at apex, preceding S1. Reflects atrial contraction into a noncompliant ventricle. Found in AS, hypertension, HOCM, CAD.</p>

      <h3>Opening Snap (OS)</h3>
      <p>High-pitched; follows S2 (by 0.06–0.12 s), heard at lower left sternal border and apex in MS. The more severe the MS, the shorter the S2–OS interval.</p>

      <h3>Ejection Clicks</h3>
      <p>High-pitched sounds following S1 typically loudest at left sternal border; observed in dilation of aortic root or pulmonary artery, congenital AS or PS. PS click decreases with inspiration.</p>

      <h3>Midsystolic Clicks</h3>
      <p>At lower left sternal border and apex, often followed by late systolic murmur in mitral valve prolapse.</p>

      <h3>Maneuvers</h3>
      <ul>
        <li><strong>Respiration:</strong> Right-sided murmurs increase with inspiration (TR, PS). Left-sided louder during expiration.</li>
        <li><strong>Valsalva:</strong> Most murmurs decrease. HOCM becomes louder. MVP becomes longer/louder (click earlier).</li>
        <li><strong>Standing:</strong> Similar to Valsalva (decreases preload). HOCM louder.</li>
        <li><strong>Squatting:</strong> Most murmurs become louder. HOCM and MVP soften.</li>
        <li><strong>Handgrip:</strong> Increases Afterload. Murmurs of MR, VSD, AR increase. HOCM and AS decrease.</li>
      </ul>
    `,
    visuals: [],
    scenes: [
      {
        id: "murmur_sim",
        title: "High-Fidelity Phonocardiogram",
        description: "Listen to synthesized heart sounds. Use maneuvers to alter hemodynamics and hear the change in HOCM vs AS.",
        objects: ["Visualizer"],
        controls: [
          { id: 'pathology', label: 'Pathology', type: 'select', options: ['Normal', 'Aortic Stenosis (Harsh)', 'Mitral Regurgitation (Blowing)', 'Mitral Stenosis (Rumble)', 'Aortic Regurgitation', 'HOCM', 'Mitral Valve Prolapse', 'S3 Gallop', 'S4 Gallop'], defaultValue: 'Normal' },
          { id: 'maneuver', label: 'Maneuver', type: 'select', options: ['None', 'Valsalva (↓ Preload)', 'Squatting (↑ Preload)'], defaultValue: 'None' }
        ],
        learningOutcome: "Differentiate murmurs by timing, quality (harsh vs blowing), and response to maneuvers.",
        renderLogic: renderSoundSim
      }
    ],
    tables: [
      {
        title: "The 'Click' Differential",
        content: [
          ["Sound", "Timing", "Pathology", "Behavior"],
          ["Ejection Click", "Early Systole (after S1)", "Bicuspid Aortic Valve / Pulmonic Stenosis", "PS click decreases w/ inspiration"],
          ["Mid-Systolic Click", "Mid Systole", "Mitral Valve Prolapse", "Moves earlier with Valsalva"],
          ["Opening Snap", "Early Diastole (after S2)", "Mitral Stenosis", "Closer to S2 = Severe"]
        ]
      }
    ],
    quiz: [
      { id: 1, question: "Which murmur increases in intensity with Valsalva maneuver?", options: ["Aortic Stenosis", "Mitral Regurgitation", "HOCM", "VSD"], correctIndex: 2, explanation: "Valsalva decreases venous return (preload), making the LV smaller. In HOCM, a smaller LV brings the septum and mitral leaflet closer, WORSENING the obstruction and making the murmur LOUDER." },
      { id: 2, question: "A patient has a fixed split S2. What is the most likely diagnosis?", options: ["LBBB", "Atrial Septal Defect", "Pulmonary Embolism", "Aortic Stenosis"], correctIndex: 1, explanation: "ASD causes L->R shunting, keeping the RV volume overloaded and the Pulmonic valve closure delayed during both inspiration and expiration (Fixed)." },
      { id: 3, question: "Paradoxical Splitting of S2 is caused by:", options: ["RBBB", "LBBB", "ASD", "Mitral Regurgitation"], correctIndex: 1, explanation: "In LBBB, LV contraction is delayed, so A2 closes AFTER P2. Inspiration delays P2, moving it closer to A2 (narrowing the split)." },
      { id: 4, question: "Which maneuver would make the murmur of Mitral Regurgitation LOUDER?", options: ["Valsalva", "Standing", "Handgrip", "Amyl Nitrate"], correctIndex: 2, explanation: "Handgrip increases systemic vascular resistance (Afterload). This forces more blood backward through the incompetent mitral valve, increasing the murmur." },
      { id: 5, question: "An Opening Snap that occurs very close to S2 indicates:", options: ["Mild Mitral Stenosis", "Severe Mitral Stenosis", "Mitral Regurgitation", "Aortic Stenosis"], correctIndex: 1, explanation: "A short S2-OS interval implies very high Left Atrial pressure, which forces the stenotic valve to snap open immediately after aortic closure." },
      { id: 6, question: "S3 is most commonly associated with:", options: ["Left Ventricular Hypertrophy", "Volume Overload (Systolic Failure)", "Mitral Stenosis", "Aortic Stenosis"], correctIndex: 1, explanation: "S3 (Ventricular Gallop) is caused by rapid early diastolic filling into a dilated ventricle." },
      { id: 7, question: "Amyl Nitrate inhalation typically causes which murmur to DECREASE?", options: ["Aortic Stenosis", "Mitral Regurgitation", "HOCM", "Pulmonic Stenosis"], correctIndex: 1, explanation: "Amyl Nitrate is a vasodilator (decreases Afterload). Regurgitant murmurs (MR, AR, VSD) decrease because forward flow is favored." },
      { id: 8, question: "A continuous machinery-like murmur is seen in:", options: ["VSD", "PDA", "Aortic Regurgitation", "Venous Hum"], correctIndex: 1, explanation: "PDA connects the high-pressure Aorta to low-pressure PA, causing continuous flow throughout systole and diastole." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod3",
    title: "Module 3: ECG Morphology & Axis",
    overview: [
      "Axis: Lead I & aVF. Left (Thumb I Up, aVF Down). Right (I Down, aVF Up).",
      "Hypertrophy: LVH (S V1 + R V5 &gt; 35mm). RVH (R &gt; S in V1).",
      "Ischemia: ST Elevation (Injury), ST Depression (Ischemia), Q waves (Infarct).",
      "Blocks: RBBB (rSR' V1). LBBB (Broad R I/V6).",
      "Electrolytes: Hyperkalemia (Peaked T). Hypokalemia (U waves)."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Electrical Axis</h3>
      <p class="mb-4 text-lg">
      Look at Leads I and aVF.
      <br/>- <strong>Normal (-30° to +90°):</strong> I (+), aVF (+).
      <br/>- <strong>Left Axis Deviation (-30° to -90°):</strong> I (+), aVF (-). <em>Causes:</em> LVH, LBBB, Inferior MI, LAFB.
      <br/>- <strong>Right Axis Deviation (+90° to +180°):</strong> I (-), aVF (+). <em>Causes:</em> RVH, LPHB, Lateral MI, PE.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Chamber Hypertrophy</h3>
      <p class="mb-4 text-lg">
      <strong>Right Ventricular Hypertrophy (RVH):</strong>
      <br/>- V1 is normally negative. In RVH, V1 becomes positive (R > S).
      <br/>- Right Axis Deviation.
      <br/><br/>
      <strong>Left Ventricular Hypertrophy (LVH):</strong>
      <br/>- Sokolow-Lyon Criteria: S wave in V1 + R wave in V5/V6 ≥ 35 mm.
      <br/>- R wave in aVL &gt; 11 mm.
      <br/>- Strain Pattern: ST depression and T-inversion in lateral leads (I, aVL, V5, V6).
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Bundle Branch Blocks (QRS &gt; 0.12s)</h3>
      <p class="mb-4 text-lg">
      <strong>Right (RBBB):</strong> "Rabbit Ears" (rSR') in V1. Slurred S wave in I and V6.
      <br/><strong>Left (LBBB):</strong> Broad, notched, monomorphic R wave in I, aVL, V5, V6. Deep QS in V1. *New LBBB = STEMI equivalent.*
      </p>
    `,
    detailedContent: `
      <h3>Heart Rate</h3>
      <p>300 divided by the number of large boxes between QRS complexes. Or 1500 divided by number of small boxes.</p>

      <h3>Mean Axis</h3>
      <ul>
        <li><strong>Normal:</strong> -30° to +90°</li>
        <li><strong>Left-axis deviation (&lt; -30°):</strong> Diffuse left ventricular disease, inferior MI, left anterior hemiblock.</li>
        <li><strong>Right-axis deviation (&gt; 90°):</strong> Right ventricular hypertrophy (R &gt; S in V1), left posterior hemiblock.</li>
      </ul>

      <h3>Intervals</h3>
      <ul>
        <li><strong>PR (0.12–0.20 s):</strong> Short in WPW. Long in First-degree AV block.</li>
        <li><strong>QRS (0.06–0.10 s):</strong> Widened in VPBs, BBB, hyperkalemia, drug toxicity.</li>
        <li><strong>QT:</strong> Prolonged in hypokalemia, hypocalcemia, drugs (Class IA, III).</li>
      </ul>

      <h3>Hypertrophy</h3>
      <ul>
        <li><strong>Right atrium:</strong> P wave ≥2.5 mm in lead II.</li>
        <li><strong>Left atrium:</strong> P biphasic in V1, terminal negative force &gt; 0.04 s.</li>
        <li><strong>Right ventricle:</strong> R &gt; S in V1 and R in V1 &gt; 5 mm; deep S in V6; right-axis deviation.</li>
        <li><strong>Left ventricle:</strong> S in V1 + R in V5 or V6 ≥ 35 mm; or R in aVL &gt;11 mm.</li>
      </ul>

      <h3>Infarction</h3>
      <ul>
        <li><strong>Pathologic Q waves:</strong> ≥0.04 s and ≥25% of total QRS height.</li>
        <li><strong>Anteroseptal:</strong> V1-V2.</li>
        <li><strong>Apical:</strong> V3-V4.</li>
        <li><strong>Anterolateral:</strong> I, aVL, V5-V6.</li>
        <li><strong>Inferior:</strong> II, III, aVF.</li>
        <li><strong>Posterior:</strong> Tall R in V1-V2 (mirror image).</li>
      </ul>
    `,
    visuals: [],
    scenes: [
      {
        id: "ecg_morph",
        title: "ECG Morphology Explorer",
        description: "Visualize how pathologies alter the QRS complex in different leads.",
        objects: ["ECG Grid"],
        controls: [
          { id: 'condition', label: 'Condition', type: 'select', options: ['Normal', 'RBBB', 'LBBB', 'LVH', 'RVH', 'STEMI (Ant)'], defaultValue: 'Normal' },
          { id: 'lead', label: 'Lead View', type: 'select', options: ['V1', 'V6'], defaultValue: 'V1' }
        ],
        learningOutcome: "Recognize the morphological hallmarks of blocks and hypertrophy in key leads.",
        renderLogic: renderMorphologySim
      },
      {
        id: "axis_sim",
        title: "Hexaxial Axis Plotter",
        description: "Correlate the mean QRS vector with limb leads I and aVF.",
        objects: ["Hexaxial"],
        controls: [
          { id: 'axis', label: 'Axis (Degrees)', type: 'slider', min: -120, max: 180, step: 15, defaultValue: 0 }
        ],
        learningOutcome: "Calculate electrical axis using the Quadrant Method.",
        renderLogic: renderECGSim
      }
    ],
    tables: [
      {
        title: "MI Localization",
        content: [
          ["Leads", "Wall", "Artery"],
          ["V1 - V2", "Septal", "LAD"],
          ["V3 - V4", "Anterior", "LAD"],
          ["V5 - V6, I, aVL", "Lateral", "Circumflex"],
          ["II, III, aVF", "Inferior", "RCA (85%) or Circ"]
        ]
      }
    ],
    quiz: [
      { id: 1, question: "Left Axis Deviation is defined as an axis between:", options: ["0 and -90", "-30 and -90", "+90 and +180", "-90 and -180"], correctIndex: 1, explanation: "Normal axis is -30 to +90. LAD is -30 to -90. Left Anterior Hemiblock is a common cause." },
      { id: 2, question: "Which finding is most specific for Right Ventricular Hypertrophy?", options: ["S > R in V1", "R > S in V1", "Deep Q waves in V6", "Left Axis Deviation"], correctIndex: 1, explanation: "Normally V1 is negative (rS). In RVH, the large RV anterior forces make V1 positive (R > S)." },
      { id: 3, question: "Broad, notched R waves in I, aVL, and V6 with absent Q waves describes:", options: ["RBBB", "LBBB", "LAFB", "Posterior MI"], correctIndex: 1, explanation: "LBBB causes delayed LV activation, producing broad monomorphic R waves in lateral leads and deep QS waves in V1." },
      { id: 4, question: "Which of the following causes Right Axis Deviation?", options: ["Inferior MI", "Left Anterior Hemiblock", "Left Posterior Hemiblock", "LBBB"], correctIndex: 2, explanation: "LPHB shifts the axis to the right. LAFB shifts it to the left." },
      { id: 5, question: "Tall, peaked T waves are the earliest sign of:", options: ["Hypokalemia", "Hyperkalemia", "Hypercalcemia", "Hypocalcemia"], correctIndex: 1, explanation: "Hyperkalemia causes peaked T waves. Hypokalemia causes U waves and flat T waves." },
      { id: 6, question: "U waves are most characteristic of:", options: ["Hyperkalemia", "Hypokalemia", "Hypercalcemia", "Hypocalcemia"], correctIndex: 1, explanation: "Hypokalemia causes ST depression, flat T waves, and prominent U waves." },
      { id: 7, question: "A Delta Wave (slurred QRS upstroke) indicates:", options: ["LBBB", "Wolff-Parkinson-White", "Hypertrophy", "Ischemia"], correctIndex: 1, explanation: "Pre-excitation of the ventricles via an accessory pathway shortens the PR interval and slurs the QRS upstroke." },
      { id: 8, question: "ST elevation in leads I, aVL, V5, V6 suggests infarction of:", options: ["Inferior Wall", "Lateral Wall", "Anterior Wall", "Posterior Wall"], correctIndex: 1, explanation: "Lateral leads look at the lateral wall of the LV (Circumflex territory)." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod4",
    title: "Module 4: Non-Invasive Imaging",
    overview: [
      "Echo: Primary tool. Bernoulli (4v²) estimates pressures.",
      "Nuclear (SPECT): Fixed defect = Scar. Reversible = Ischemia.",
      "Stress Echo: New wall motion abnormality = Ischemia.",
      "Cardiac MRI: Gold standard for Volumes/Mass and Infiltrative disease (Amyloid)."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Echocardiography</h3>
      <p class="mb-4 text-lg">
      Uses ultrasound to visualize structure and flow.
      <br/>- <strong>RVSP Calculation:</strong> Uses Tricuspid Regurgitation (TR) jet velocity.
      <br/>  Formula: RVSP = 4(V_TR)² + Right Atrial Pressure.
      <br/>  <em>Example:</em> TR jet 3 m/s. Gradient = 4*(3^2) = 36. If RAP is 10, RVSP = 46 mmHg.
      <br/>- <strong>Bubble Study:</strong> Agitated saline. If bubbles cross to LA within 3 beats = Intracardiac Shunt (PFO/ASD). Late appearance = Pulmonary AV shunt.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Stress Testing Modalities</h3>
      <p class="mb-4 text-lg">
      Goal: Provoke ischemia (supply/demand mismatch).
      <br/>- <strong>Exercise ECG:</strong> First line if able to exercise and ECG is normal.
      <br/>- <strong>Stress Echo:</strong> Look for <em>new wall motion abnormalities</em>.
      <br/>- <strong>Nuclear (SPECT/PET):</strong> Compare perfusion at stress vs rest.
      <br/>  * Fixed Defect (Dark/Dark) = Infarct.
      <br/>  * Reversible Defect (Dark/Bright) = Ischemia.
      </p>
    `,
    detailedContent: `
      <h3>Echocardiography</h3>
      <p><strong>2-D Echo:</strong> Assess chamber size, hypertrophy, wall motion, valves, pericardium, aorta.</p>
      <p><strong>Doppler:</strong> Assess valvular stenosis/regurgitation, shunts, diastolic function.</p>
      <p><strong>RVSP Calculation:</strong> 4 × (TR velocity)² + RA pressure.</p>
      <p><strong>Transesophageal (TEE):</strong> Superior for infective endocarditis, cardiac source of embolism, prosthetic valve dysfunction, aortic dissection.</p>

      <h3>Nuclear Cardiology</h3>
      <p><strong>SPECT/PET:</strong> Zones of prior infarction appear as fixed defects. Ischemia appears as reversible defects (perfusion defect at stress, normal at rest).</p>
      <p><strong>Pharmacologic Stress:</strong> Adenosine, regadenoson, dipyridamole (vasodilators) or dobutamine (inotrope). Used if patient cannot exercise or has LBBB (vasodilators preferred).</p>

      <h3>Cardiac MRI (CMR)</h3>
      <p>High resolution without radiation. Excellent for LV mass, pericardium, infiltrative disease (Amyloid), congenital defects. Delayed gadolinium enhancement differentiates ischemic from nonischemic cardiomyopathy.</p>

      <h3>Cardiac CT</h3>
      <p>High resolution for coronary anatomy (exclude high-grade stenosis), aortic aneurysms/dissection, pulmonary embolism.</p>
    `,
    visuals: [],
    scenes: [],
    tables: [
      {
        title: "Pharmacologic Stress Agents",
        content: [
          ["Agent", "Mechanism", "Preferred In"],
          ["Adenosine / Regadenoson", "Coronary Vasodilation", "LBBB (prevents septal artifact), Pacemakers"],
          ["Dobutamine", "Beta-1 Agonist (↑ HR/Contractility)", "Reactive Airway Disease (Asthma/COPD)"]
        ]
      }
    ],
    quiz: [
      { id: 1, question: "Which finding on Nuclear Stress Test indicates ischemia?", options: ["Defect at Rest and Stress", "Defect at Stress, Normal at Rest", "Normal at Stress, Defect at Rest", "Dilated LV at rest"], correctIndex: 1, explanation: "A reversible defect (seen only at stress) indicates viable myocardium that is not receiving enough blood flow during demand (Ischemia)." },
      { id: 2, question: "The preferred stress agent for a patient with LBBB is:", options: ["Dobutamine", "Adenosine", "Exercise Treadmill", "Epinephrine"], correctIndex: 1, explanation: "Exercise and Dobutamine (high heart rates) cause septal motion artifacts in LBBB that mimic ischemia. Vasodilators (Adenosine) are preferred." },
      { id: 3, question: "TEE is superior to TTE for visualizing:", options: ["LV Ejection Fraction", "Left Atrial Appendage Thrombus", "LV Hypertrophy", "Pericardial Effusion"], correctIndex: 1, explanation: "The LA appendage is posterior structure well visualized from the esophagus (TEE), but poorly seen on TTE." },
      { id: 4, question: "RV Systolic Pressure is calculated using:", options: ["Mitral Inflow velocity", "Tricuspid Regurgitation velocity", "Aortic jet velocity", "Pulmonic flow"], correctIndex: 1, explanation: "The modified Bernoulli equation (4v^2) applied to the TR jet gives the pressure gradient between RV and RA." },
      { id: 5, question: "Delayed Gadolinium Enhancement in a subendocardial distribution suggests:", options: ["Ischemic Cardiomyopathy", "Amyloidosis", "Sarcoidosis", "Myocarditis"], correctIndex: 0, explanation: "Ischemia affects the subendocardium first. Non-ischemic causes usually spare the subendocardium or are mid-wall." },
      { id: 6, question: "Which finding on Stress Echocardiogram indicates ischemia?", options: ["Fixed wall motion abnormality", "New wall motion abnormality at peak stress", "LV hypertrophy", "Dilated LA"], correctIndex: 1, explanation: "Ischemia causes transient wall motion abnormalities that appear during stress and resolve at rest." },
      { id: 7, question: "Agitated Saline Study (Bubble Study) is used to detect:", options: ["Aortic Stenosis", "Intracardiac Shunt (PFO/ASD)", "Mitral Regurgitation", "LV Thrombus"], correctIndex: 1, explanation: "Bubbles crossing from Right to Left atrium indicate a shunt." },
      { id: 8, question: "Coronary CT Angiography has high:", options: ["Positive Predictive Value", "Negative Predictive Value", "Radiation dose compared to Cath", "Risk of bleeding"], correctIndex: 1, explanation: "CCTA is excellent for ruling OUT CAD (High NPV). A normal scan effectively excludes significant disease." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod5",
    title: "Module 5: Congenital Heart Disease",
    overview: [
      "ASD: Fixed Split S2. Ostium Secundum (common). Embolism risk.",
      "VSD: Holosystolic murmur LSB. Small VSD = Louder murmur.",
      "PDA: Continuous machinery murmur. Close with Indomethacin.",
      "Coarctation: HTN in arms, low BP in legs. Rib notching.",
      "Tetralogy of Fallot: VSD, PS, Overriding Aorta, RVH. Cyanosis depends on PS."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Atrial Septal Defect (ASD)</h3>
      <p class="mb-4 text-lg">
      L->R shunt at atrial level. Volume overload of RA and RV.
      <br/>- <strong>Exam:</strong> Fixed Split S2 (RV overload delays P2 regardless of breath). Systolic ejection murmur (increased flow across Pulmonic Valve, NOT the ASD itself).
      <br/>- <strong>Types:</strong> Secundum (Mid-septum, 75%), Primum (Low, Down syndrome), Sinus Venosus (High).
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Ventricular Septal Defect (VSD)</h3>
      <p class="mb-4 text-lg">
      L->R shunt at ventricular level.
      <br/>- <strong>Exam:</strong> Harsh Holosystolic murmur at LSB. Palpable thrill.
      <br/>- <strong>Physics:</strong> Small defects have high turbulence -> Loud murmur (Maladie de Roger). Large defects equalize pressure -> Softer murmur but Heart Failure/Eisenmenger.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Coarctation of the Aorta</h3>
      <p class="mb-4 text-lg">
      Narrowing of aorta at ductus arteriosus insertion (distal to L Subclavian).
      <br/>- <strong>Clinical:</strong> HTN in upper extremities, weak/delayed femoral pulses. Headache, epistaxis.
      <br/>- <strong>X-Ray:</strong> "Figure 3" sign on aorta. Rib Notching (collateral intercostal flow).
      <br/>- Associated with Bicuspid Aortic Valve and Turner Syndrome.
      </p>
    `,
    detailedContent: `
      <h3>Atrial Septal Defect (ASD)</h3>
      <ul>
        <li><strong>Types:</strong> Ostium secundum (mid), Ostium primum (low, Down syndrome), Sinus venosus (high).</li>
        <li><strong>Exam:</strong> Wide, fixed splitting of S2; systolic flow murmur (pulmonic valve); diastolic flow rumble (tricuspid).</li>
        <li><strong>ECG:</strong> Incomplete RBBB (rSR'); Left axis (primum); First degree block (sinus venosus).</li>
        <li><strong>Treatment:</strong> Closure if Qp/Qs ≥ 1.5:1 with right heart enlargement.</li>
      </ul>

      <h3>Ventricular Septal Defect (VSD)</h3>
      <ul>
        <li><strong>Exam:</strong> Holosystolic murmur at LSB; Palpable thrill.</li>
        <li><strong>Treatment:</strong> Closure if symptoms/volume overload or Qp/Qs &gt; 1.5:1.</li>
      </ul>

      <h3>Patent Ductus Arteriosus (PDA)</h3>
      <ul>
        <li><strong>Exam:</strong> Hyperactive LV impulse; loud continuous "machinery" murmur below left clavicle.</li>
        <li><strong>Treatment:</strong> Surgical ligation or transcatheter closure.</li>
      </ul>

      <h3>Coarctation of the Aorta</h3>
      <ul>
        <li><strong>Exam:</strong> HTN in arms; delayed femoral pulses. Systolic murmur over upper back. Continuous murmur over scapula (collaterals).</li>
        <li><strong>CXR:</strong> Rib notching; "Figure 3" sign.</li>
        <li><strong>Treatment:</strong> Surgery or stenting.</li>
      </ul>

      <h3>Tetralogy of Fallot</h3>
      <p>1. VSD, 2. RV Outflow Obstruction (PS), 3. Overriding Aorta, 4. RVH.</p>
      <ul>
        <li><strong>Exam:</strong> Boot-shaped heart on CXR. Cyanosis depends on severity of PS.</li>
      </ul>
    `,
    visuals: [],
    scenes: [
      {
        id: "congenital_sim",
        title: "Oximetry Run",
        description: "Trace the Oxygen Saturation Step-Up to diagnose the shunt.",
        objects: ["Heart Schematic"],
        controls: [
          { id: 'shunt', label: 'Lesion', type: 'select', options: ['None', 'ASD', 'VSD', 'PDA'], defaultValue: 'None' }
        ],
        learningOutcome: "Locate the level of shunting based on saturation data: ASD (RA step-up), VSD (RV step-up), PDA (PA step-up).",
        renderLogic: renderCongenitalSim
      }
    ],
    tables: [],
    quiz: [
      { id: 1, question: "An Oxygen saturation step-up from 70% in the RA to 85% in the RV indicates:", options: ["ASD", "VSD", "PDA", "Tetralogy of Fallot"], correctIndex: 1, explanation: "Oxygenated blood from the LV crosses the VSD into the RV, raising the saturation at the ventricular level." },
      { id: 2, question: "Which lesion is most associated with Rib Notching on CXR?", options: ["ASD", "VSD", "Coarctation of Aorta", "PDA"], correctIndex: 2, explanation: "In Coarctation, collateral flow through intercostal arteries erodes the underside of the ribs." },
      { id: 3, question: "A continuous 'machinery' murmur is characteristic of:", options: ["VSD", "PDA", "Aortic Regurgitation", "Mitral Stenosis"], correctIndex: 1, explanation: "PDA connects high pressure Aorta to lower pressure PA, causing flow throughout systole and diastole." },
      { id: 4, question: "The severity of cyanosis in Tetralogy of Fallot is determined by:", options: ["Size of VSD", "Degree of Pulmonic Stenosis", "Degree of Overriding Aorta", "RV Hypertrophy"], correctIndex: 1, explanation: "Severe PS forces more deoxygenated blood across the VSD into the Aorta (R->L shunt). If PS is mild, patient may be acyanotic ('Pink Tet')." },
      { id: 5, question: "Fixed Splitting of S2 is caused by:", options: ["LBBB", "RBBB", "ASD", "Pulmonary Hypertension"], correctIndex: 2, explanation: "ASD causes volume overload of the RV. The large volume keeps the Pulmonic valve open longer, regardless of respiratory cycle." },
      { id: 6, question: "Eisenmenger Syndrome refers to:", options: ["Reversal of shunt to R->L due to PHTN", "Closure of VSD", "Heart Failure in ASD", "Infective Endocarditis"], correctIndex: 0, explanation: "Chronic L->R shunt causes pulmonary vascular remodeling and hypertension. When PA pressure > Systemic, the shunt reverses, causing cyanosis." },
      { id: 7, question: "Ostium Primum ASD is associated with:", options: ["Down Syndrome", "Turner Syndrome", "Marfan Syndrome", "Noonan Syndrome"], correctIndex: 0, explanation: "Endocardial cushion defects (Primum ASD, Inlet VSD, Cleft Mitral) are common in Trisomy 21." },
      { id: 8, question: "Anomalous Pulmonary Venous Return is associated with which ASD?", options: ["Secundum", "Primum", "Sinus Venosus", "Coronary Sinus"], correctIndex: 2, explanation: "Sinus Venosus defects (high in septum) often involve drainage of the Right Pulmonary Veins into the SVC." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod6",
    title: "Module 6: Valvular Heart Disease",
    overview: [
      "Mitral Stenosis: Rheumatic. Opening Snap. Diastolic Rumble. A-Fib common.",
      "Mitral Regurg: Chronic (LA dilation, asymptomatic) vs Acute (Pulm Edema).",
      "Aortic Stenosis: Angina, Syncope, Dyspnea. Parvus et Tardus.",
      "Aortic Regurg: Wide Pulse Pressure. Water-Hammer pulse. Austin Flint murmur."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Mitral Stenosis</h3>
      <p class="mb-4 text-lg">
      Almost always Rheumatic. Fusion of commissures.
      <br/>- <strong>Pathophys:</strong> Obstruction LA->LV. LA pressure ↑ -> PHTN -> RV Failure. LA dilation -> Afib -> Thrombus.
      <br/>- <strong>Auscultation:</strong> Loud S1. Opening Snap (OS) follows S2. Diastolic Rumble.
      <br/>- <strong>Severity:</strong> The higher the LA pressure, the faster the valve snaps open. <strong>Short S2-OS interval = Severe MS.</strong>
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Aortic Stenosis</h3>
      <p class="mb-4 text-lg">
      Calcific (elderly) or Bicuspid (young).
      <br/>- <strong>Symptoms (SAD):</strong> Syncope, Angina, Dyspnea. (Survival: 3, 5, 2 years respectively).
      <br/>- <strong>Exam:</strong> Pulsus parvus et tardus (weak/late). Soft/Absent S2. Late-peaking systolic murmur.
      <br/>- <strong>Severe Criteria:</strong> Valve Area &lt; 1.0 cm². Mean Gradient &gt; 40 mmHg. Jet Velocity &gt; 4.0 m/s.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Aortic Regurgitation</h3>
      <p class="mb-4 text-lg">
      Leaflet abnormality (Bicuspid/Endocarditis) or Root dilation (HTN/Marfan/Dissection).
      <br/>- <strong>Pathophys:</strong> Volume overload of LV. Large Stroke Volume -> High SBP. Diastolic runoff -> Low DBP. = <strong>Wide Pulse Pressure.</strong>
      <br/>- <strong>Exam:</strong> Bounding pulses (Water-Hammer). Head bobbing (De Musset). Early diastolic decrescendo murmur.
      <br/>- <strong>Austin Flint Murmur:</strong> Regurgitant jet hits mitral leaflet, causing functional MS rumble.
      </p>
    `,
    detailedContent: `
      <h3>Mitral Stenosis (MS)</h3>
      <ul>
        <li><strong>Etiology:</strong> Rheumatic.</li>
        <li><strong>Exam:</strong> RV lift, palpable S1, Opening Snap (0.05-0.12s after A2), Diastolic rumbling murmur (presystolic accentuation in sinus rhythm).</li>
        <li><strong>Treatment:</strong> Diuretics for dyspnea; Beta blockers for HR control; Warfarin for AF. Valvotomy if MVA ≤ 1.5 cm².</li>
      </ul>

      <h3>Mitral Regurgitation (MR)</h3>
      <ul>
        <li><strong>Acute:</strong> Pulmonary edema.</li>
        <li><strong>Chronic:</strong> Fatigue, dyspnea. Holosystolic murmur at apex radiating to axilla. S3 common.</li>
        <li><strong>Treatment:</strong> Surgery if symptomatic or LVEF < 60% or End-systolic diameter ≥ 40mm.</li>
      </ul>

      <h3>Aortic Stenosis (AS)</h3>
      <ul>
        <li><strong>Symptoms:</strong> Dyspnea, Angina, Syncope.</li>
        <li><strong>Exam:</strong> Parvus et tardus pulse. Soft A2. S4 common. Crescendo-decrescendo murmur R 2nd ICS.</li>
        <li><strong>Treatment:</strong> Replacement if severe (Area < 1 cm²) and symptomatic or LVEF < 50%.</li>
      </ul>

      <h3>Aortic Regurgitation (AR)</h3>
      <ul>
        <li><strong>Exam:</strong> Widened pulse pressure, water hammer pulse, Quincke's sign. Decrescendo early diastolic murmur.</li>
        <li><strong>Treatment:</strong> Surgery if symptomatic or LVEF &lt; 50% or End-systolic diameter &gt; 50mm.</li>
      </ul>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "Which physical sign indicates severe Mitral Stenosis?", options: ["Loud S1", "Long Diastolic Rumble", "Short S2-Opening Snap interval", "Soft S1"], correctIndex: 2, explanation: "A short S2-OS interval implies very high Left Atrial pressure, which forces the mitral valve to snap open immediately after the aortic valve closes." },
      { id: 2, question: "The most common cause of Mitral Stenosis is:", options: ["Calcification", "Rheumatic Fever", "Endocarditis", "Congenital"], correctIndex: 1, explanation: "Rheumatic heart disease is the cause of nearly all cases of Mitral Stenosis." },
      { id: 3, question: "Pulsus Parvus et Tardus is classic for:", options: ["Aortic Regurgitation", "Aortic Stenosis", "Mitral Regurgitation", "HOCM"], correctIndex: 1, explanation: "The fixed obstruction of AS delays the upstroke (tardus) and reduces the amplitude (parvus)." },
      { id: 4, question: "Which is an indication for surgery in Chronic Severe MR?", options: ["LVEF < 60%", "LVEF < 30%", "Asymptomatic with normal EF", "Palpitations"], correctIndex: 0, explanation: "Because MR unloads the LV (ejects into low pressure LA), EF should be super-normal. An EF < 60% indicates incipient LV dysfunction." },
      { id: 5, question: "A blowing, early diastolic decrescendo murmur is seen in:", options: ["Mitral Stenosis", "Aortic Stenosis", "Aortic Regurgitation", "Mitral Regurgitation"], correctIndex: 2, explanation: "AR causes backflow during diastole. The pressure gradient is highest early in diastole, creating a decrescendo murmur." },
      { id: 6, question: "Carvallo's Sign refers to:", options: ["Increase in murmur intensity with inspiration", "Increase in murmur with Valsalva", "Decreased JVP with inspiration", "Head bobbing"], correctIndex: 0, explanation: "Right sided murmurs (TR, PS) increase with inspiration due to increased venous return. This distinguishes TR from MR." },
      { id: 7, question: "The Austin Flint murmur is associated with:", options: ["Aortic Stenosis", "Mitral Stenosis", "Aortic Regurgitation", "Pulmonic Regurgitation"], correctIndex: 2, explanation: "Severe AR jet strikes the anterior mitral leaflet, preventing it from opening fully, causing a functional Mitral Stenosis rumble." },
      { id: 8, question: "Gallavardin Phenomenon refers to:", options: ["AS murmur radiating to apex", "MR murmur radiating to back", "AR murmur heard on right", "VSD murmur with thrill"], correctIndex: 0, explanation: "The musical/high-frequency components of AS can radiate to the apex and mimic MR. However, AS will not have a wide pulse pressure." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod7",
    title: "Module 7: Cardiomyopathies",
    overview: [
      "Dilated: Systolic failure (EF < 40%). S3. Eccentric hypertrophy.",
      "Hypertrophic (HOCM): Diastolic failure. Septal thickening. Obstruction.",
      "Restrictive: Stiff walls. Amyloid/Sarcoid. Bi-atrial enlargement.",
      "Myocarditis: Viral (Coxsackie). Troponin elevation w/o CAD."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Hypertrophic Cardiomyopathy (HOCM)</h3>
      <p class="mb-4 text-lg">
      Autosomal Dominant (Sarcomere mutations). Asymmetric Septal Hypertrophy.
      <br/>- <strong>Pathophys:</strong> 1. Diastolic dysfunction (stiff). 2. Dynamic LVOT Obstruction (Septum + SAM of Mitral Valve). 3. Ischemia (supply/demand).
      <br/>- <strong>Exam:</strong> Triple Ripple apex. Bisferiens pulse. Harsh systolic murmur at LSB.
      <br/>- <strong>Dynamic Auscultation:</strong> Murmur gets <strong>LOUDER</strong> with maneuvers that decrease LV size (Valsalva, Standing) because obstruction increases.
      <br/>- <strong>Tx:</strong> Beta Blockers (increase filling time). Avoid Digoxin/Diuretics/Nitrates.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Restrictive Cardiomyopathy</h3>
      <p class="mb-4 text-lg">
      Rigid ventricular walls with normal systolic function.
      <br/>- <strong>Amyloidosis:</strong> "Speckled" myocardium on Echo. Low Voltage ECG despite thick walls (infiltrate is not muscle). Bi-atrial enlargement.
      <br/>- <strong>Differentiation:</strong> Resembles Constrictive Pericarditis but usually has elevated BNP and concordant respiratory pressure changes.
      </p>
    `,
    detailedContent: `
      <h3>Dilated Cardiomyopathy</h3>
      <p>Dilated LV with poor systolic function.</p>
      <ul>
        <li><strong>Etiology:</strong> Familial (Titin), Viral (Coxsackie), Toxins (Alcohol, Doxorubicin), Peripartum.</li>
        <li><strong>Exam:</strong> S3, JVD, mitral regurgitation.</li>
        <li><strong>Treatment:</strong> Standard HF therapy (BB, ACEi, MRA).</li>
      </ul>

      <h3>Hypertrophic Cardiomyopathy</h3>
      <p>Marked LV hypertrophy, often asymmetric.</p>
      <ul>
        <li><strong>Exam:</strong> Bisferiens pulse, S4, harsh systolic murmur at LSB (increases with Valsalva/Standing).</li>
        <li><strong>ECG:</strong> LVH, prominent septal Q waves.</li>
        <li><strong>Treatment:</strong> Beta blockers, Verapamil. Avoid digoxin/nitrates. ICD for high risk.</li>
      </ul>

      <h3>Restrictive Cardiomyopathy</h3>
      <p>Abnormal diastolic relaxation, normal systolic function.</p>
      <ul>
        <li><strong>Etiology:</strong> Amyloidosis, Sarcoidosis, Hemochromatosis.</li>
        <li><strong>Exam:</strong> Kussmaul sign, S4.</li>
        <li><strong>Echo:</strong> Bi-atrial enlargement, "speckled" myocardium (Amyloid).</li>
      </ul>

      <h3>Myocarditis</h3>
      <p>Inflammation (Viral, Chagas, Giant Cell). Treat as Heart Failure.</p>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "Which maneuver increases the murmur of HOCM?", options: ["Squatting", "Handgrip", "Valsalva", "Leg Raise"], correctIndex: 2, explanation: "Valsalva reduces preload/LV size, bringing the septum closer to the mitral valve, worsening obstruction." },
      { id: 2, question: "A 'speckled' pattern on Echocardiogram is characteristic of:", options: ["Sarcoidosis", "Amyloidosis", "Hemochromatosis", "Viral Myocarditis"], correctIndex: 1, explanation: "Amyloid protein infiltration creates a granular 'sparkling' texture." },
      { id: 3, question: "Which drug is contraindicated in HOCM?", options: ["Metoprolol", "Verapamil", "Digoxin", "Disopyramide"], correctIndex: 2, explanation: "Digoxin (positive inotrope) increases contractility, which can worsen the dynamic outflow obstruction." },
      { id: 4, question: "Low voltage ECG combined with thick ventricular walls on Echo suggests:", options: ["LVH", "Amyloidosis", "Pericardial Effusion", "Obesity"], correctIndex: 1, explanation: "Infiltrative cardiomyopathy thickens the wall with protein, not muscle, so electrical voltage is low." },
      { id: 5, question: "The most common cause of Myocarditis is:", options: ["Bacterial", "Viral", "Fungal", "Autoimmune"], correctIndex: 1, explanation: "Viral infections (Coxsackie B, Parvovirus B19, HHV6) are the leading cause." },
      { id: 6, question: "Alcoholic Cardiomyopathy is a type of:", options: ["Dilated CM", "Hypertrophic CM", "Restrictive CM", "Ischemic CM"], correctIndex: 0, explanation: "Alcohol is toxic to myocardium and causes dilation and systolic failure. Can reverse with abstinence." },
      { id: 7, question: "Doxorubicin (Adriamycin) toxicity causes:", options: ["Dilated CM", "Restrictive CM", "Hypertrophic CM", "Valvular disease"], correctIndex: 0, explanation: "Anthracyclines cause irreversible myocardial damage leading to DCM." },
      { id: 8, question: "Sudden Cardiac Death in a young athlete is most likely due to:", options: ["HOCM", "Dilated CM", "Mitral Prolapse", "Aortic Stenosis"], correctIndex: 0, explanation: "HOCM is the leading cause of SCD in young athletes due to ventricular arrhythmias." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod8",
    title: "Module 8: Pericardial Disease",
    overview: [
      "Acute Pericarditis: Pleuritic chest pain, friction rub, diffuse STE.",
      "Tamponade: Fluid compresses heart. Beck's Triad. Pulsus Paradoxus.",
      "Constriction: Scarred pericardium. Kussmaul sign. Pericardial Knock.",
      "Treatment: NSAIDs/Colchicine (Pericarditis). Pericardiocentesis (Tamponade)."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Acute Pericarditis</h3>
      <p class="mb-4 text-lg">
      Inflammation of pericardial sac. 85% Viral/Idiopathic. Also Uremia, TB, SLE, Post-MI (Dressler's).
      <br/>- <strong>Clinical:</strong> Sharp pleuritic chest pain, relieved by sitting forward. Friction Rub (3 component).
      <br/>- <strong>ECG Stages:</strong> 1. Diffuse ST Elevation (Concave Up) + PR Depression. 2. Normal. 3. T wave inversion. 4. Normal.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Cardiac Tamponade</h3>
      <p class="mb-4 text-lg">
      Accumulation of fluid under pressure compromises cardiac filling.
      <br/>- <strong>Beck's Triad:</strong> Hypotension, JVD, Muffled Heart Sounds.
      <br/>- <strong>Physiology:</strong> Equalization of diastolic pressures (RA = RV = PA = PCWP).
      <br/>- <strong>Key Sign:</strong> <strong>Pulsus Paradoxus</strong> (>10mmHg drop in SBP with inspiration).
      <br/>- <strong>Echo:</strong> RA/RV Diastolic Collapse. Dilated IVC.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Constrictive Pericarditis</h3>
      <p class="mb-4 text-lg">
      Fibrotic, calcified shell limits diastolic expansion. TB, Radiation, Post-Surg.
      <br/>- <strong>Physiology:</strong> Rapid early filling -> Sudden Halt. Ventricular interdependence.
      <br/>- <strong>Signs:</strong> Kussmaul Sign (JVD rises w/ inspiration). Pericardial Knock (high pitched, early diastole).
      <br/>- <strong>Tracing:</strong> "Square Root Sign" or "Dip and Plateau" in ventricular pressure.
      </p>
    `,
    detailedContent: `
      <h3>Acute Pericarditis</h3>
      <ul>
        <li><strong>History:</strong> Pleuritic, positional chest pain.</li>
        <li><strong>ECG:</strong> Diffuse ST elevation (concave up), PR depression (PR elevation in aVR).</li>
        <li><strong>Treatment:</strong> NSAIDs + Colchicine. Avoid anticoagulants.</li>
      </ul>

      <h3>Cardiac Tamponade</h3>
      <ul>
        <li><strong>Physical:</strong> Tachycardia, Hypotension, Pulsus Paradoxus (>10 mmHg drop in SBP with inspiration), JVD (loss of y descent).</li>
        <li><strong>Cath:</strong> Equalization of diastolic pressures.</li>
        <li><strong>Treatment:</strong> Pericardiocentesis/Window.</li>
      </ul>

      <h3>Constrictive Pericarditis</h3>
      <ul>
        <li><strong>Physical:</strong> Kussmaul sign, Pericardial Knock, JVD (prominent y descent).</li>
        <li><strong>Cath:</strong> Dip and plateau (Square Root sign).</li>
        <li><strong>Treatment:</strong> Pericardiectomy.</li>
      </ul>
    `,
    visuals: [],
    scenes: [
      {
        id: "pericardial_sim",
        title: "Hemodynamic Differentiation",
        description: "Compare the ventricular pressure tracings of Tamponade vs Constriction.",
        objects: ["Pressure Graph"],
        controls: [
          { id: 'condition', label: 'Pathology', type: 'select', options: ['Normal', 'Tamponade', 'Constriction'], defaultValue: 'Normal' }
        ],
        learningOutcome: "Identify 'Equalization of Pressures' vs 'Square Root Sign'.",
        renderLogic: renderPericardialSim
      }
    ],
    tables: [
      {
        title: "Tamponade vs Constriction",
        content: [
          ["Feature", "Tamponade", "Constriction"],
          ["Pathophys", "Fluid Compression", "Rigid Shell"],
          ["Diastolic Filling", "Impaired throughout", "Rapid early, then halt"],
          ["Pulsus Paradoxus", "Prominent", "Uncommon"],
          ["Kussmaul Sign", "Rare", "Common"],
          ["Sound", "Muffled", "Pericardial Knock"],
          ["Hemodynamics", "Diastolic Equalization", "Dip and Plateau"]
        ]
      }
    ],
    quiz: [
      { id: 1, question: "Pulsus Paradoxus is defined as:", options: [">10 mmHg drop in SBP with inspiration", ">10 mmHg rise in SBP with inspiration", "Alternating strong/weak beats", "Double systolic peak"], correctIndex: 0, explanation: "In tamponade, inspiration increases RV filling, which pushes the septum into the LV (interdependence), reducing LV filling and SBP." },
      { id: 2, question: "The Square Root Sign (Dip and Plateau) is seen in:", options: ["Tamponade", "Constrictive Pericarditis", "Dilated Cardiomyopathy", "Aortic Stenosis"], correctIndex: 1, explanation: "Rapid early diastolic filling is abruptly halted by the rigid pericardium." },
      { id: 3, question: "PR segment depression is specific for:", options: ["Acute MI", "Acute Pericarditis", "Tamponade", "Pulmonary Embolism"], correctIndex: 1, explanation: "Atrial inflammation causes PR depression (and often PR elevation in aVR)." },
      { id: 4, question: "Kussmaul Sign is characteristic of:", options: ["Tamponade", "Constriction", "Acute Pericarditis", "MVP"], correctIndex: 1, explanation: "In Constriction, the RV cannot accommodate the inspiratory increase in venous return, so JVP rises paradoxically." },
      { id: 5, question: "Initial treatment for idiopathic pericarditis includes:", options: ["Antibiotics", "NSAIDs + Colchicine", "Steroids", "Pericardiocentesis"], correctIndex: 1, explanation: "Colchicine reduces recurrence rates. Steroids are reserved for refractory or autoimmune cases." },
      { id: 6, question: "Ewart's Sign (dullness at left scapular tip) is seen in:", options: ["Pneumonia", "Large Pericardial Effusion", "Aortic Dissection", "Pulmonary Embolism"], correctIndex: 1, explanation: "Large effusion compresses the left lung base." },
      { id: 7, question: "Dressler's Syndrome occurs:", options: ["2-3 days post-MI", "2-3 weeks post-MI", "During the MI", "Years later"], correctIndex: 1, explanation: "It is an autoimmune pericarditis appearing weeks after myocardial injury." },
      { id: 8, question: "Electrical Alternans is specific for:", options: ["HOCM", "Cardiac Tamponade", "Constrictive Pericarditis", "Ventricular Tachycardia"], correctIndex: 1, explanation: "The heart swings back and forth in the large fluid sac, changing the electrical axis beat-to-beat." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod9",
    title: "Module 9: Hypertension",
    overview: [
      "Definition: >130/80 (Stage 1). >140/90 (Stage 2).",
      "Secondary HTN: Screen if <30yo, resistant, or sudden onset.",
      "Hyperaldosteronism: HTN + Hypokalemia. High Aldo/Renin Ratio.",
      "Renovascular: Abdominal Bruit. Flash Pulmonary Edema.",
      "Emergency: >180/120 + End Organ Damage. Lower MAP 25% in 1st hour."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Secondary Hypertension Clues</h3>
      <p class="mb-4 text-lg">
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Renal Parenchymal Dz:</strong> High Cr, Proteinuria. Most common cause.</li>
        <li><strong>Renovascular (RAS):</strong> Abdominal Bruit. Rise in Cr &gt;30% after ACEi. Recurrent Flash Pulmonary Edema.</li>
        <li><strong>Primary Aldosteronism (Conn's):</strong> Hypertension + Hypokalemia (spontaneous or diuretic induced). Dx: Plasma Aldosterone/Renin Ratio &gt; 20.</li>
        <li><strong>Pheochromocytoma:</strong> 5 P's (Paroxysmal, Pain/HA, Pressure, Palpitations, Perspiration). Dx: Plasma Metanephrines.</li>
        <li><strong>Cushing's:</strong> Moon facies, striae, central obesity.</li>
        <li><strong>Coarctation:</strong> BP Arms &gt; Legs. Radial-Femoral delay.</li>
      </ul>
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Hypertensive Emergency</h3>
      <p class="mb-4 text-lg">
      BP > 180/120 WITH acute end-organ damage (Encephalopathy, MI, dissection, AKI, papilledema).
      <br/>- <strong>Goal:</strong> Lower MAP by max 25% in 1st hour. If lowered too fast -> Ischemic Stroke/MI.
      <br/>- <strong>Exception:</strong> Aortic Dissection (Lower rapidly to SBP < 120).
      <br/>- <strong>Meds:</strong> IV Nitroprusside, Labetalol, Nicardipine.
      </p>
    `,
    detailedContent: `
      <h3>Definitions</h3>
      <ul>
        <li><strong>Stage 1:</strong> 130-139 / 80-89 mmHg.</li>
        <li><strong>Stage 2:</strong> ≥140 / ≥90 mmHg.</li>
      </ul>

      <h3>Secondary Hypertension</h3>
      <ul>
        <li><strong>Renal Artery Stenosis:</strong> Abdominal bruit, recent onset, hypokalemia.</li>
        <li><strong>Pheochromocytoma:</strong> Paroxysmal headache, sweating, tachycardia. Elevated metanephrines.</li>
        <li><strong>Hyperaldosteronism:</strong> Hypokalemia, suppressed renin, elevated aldosterone.</li>
        <li><strong>Coarctation:</strong> Delayed femoral pulses, rib notching.</li>
      </ul>

      <h3>Treatment</h3>
      <ul>
        <li><strong>First Line:</strong> Thiazides, ACEi/ARB, CCB.</li>
        <li><strong>Malignant HTN:</strong> Abrupt increase with decompensation (Encephalopathy). Treat with IV Nitroprusside, Nicardipine, or Labetalol. Goal: Lower MAP gradually (except Dissection).</li>
      </ul>

      <h3>Metabolic Syndrome</h3>
      <p>3 or more: Obesity (Waist >102cm M, >88cm F), Triglycerides ≥150, HDL <40 M/<50 F, BP ≥130/85, Glucose ≥100.</p>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "35yo woman with BP 160/100. Labs show K+ 3.1. Most appropriate screening test?", options: ["Plasma Metanephrines", "Renal Artery Doppler", "Aldosterone/Renin Ratio", "24hr Urine Cortisol"], correctIndex: 2, explanation: "HTN + Hypokalemia is classic for Primary Hyperaldosteronism (Conn's Syndrome). Screen with ARR." },
      { id: 2, question: "Goal BP reduction in Hypertensive Emergency (non-dissection) is:", options: ["Normalize BP in 1 hour", "Lower MAP by 25% in 1st hour", "Lower SBP to <140 immediately", "Do not lower BP"], correctIndex: 1, explanation: "Rapid reduction can cause cerebral or coronary ischemia due to autoregulation shifts." },
      { id: 3, question: "Which drug is contraindicated in bilateral renal artery stenosis?", options: ["Amlodipine", "HCTZ", "ACE Inhibitors", "Beta Blockers"], correctIndex: 2, explanation: "ACE inhibitors dilate the efferent arteriole, which is maintaining GFR in the setting of stenosis. Can cause acute renal failure." },
      { id: 4, question: "Paroxysms of headache, sweating, and palpitations suggests:", options: ["Hyperthyroidism", "Pheochromocytoma", "Carcinoid", "Panic Attack"], correctIndex: 1, explanation: "The classic triad of Pheochromocytoma." },
      { id: 5, question: "Which is NOT a component of Metabolic Syndrome?", options: ["High Triglycerides", "Low HDL", "High LDL", "Central Obesity"], correctIndex: 2, explanation: "High LDL is a risk factor but not part of the definition (TG, HDL, BP, Glucose, Waist)." },
      { id: 6, question: "Masked Hypertension is defined as:", options: ["High at home, Low in clinic", "High in clinic, Low at home", "High only at night", "High only with stress"], correctIndex: 0, explanation: "Masked HTN carries high cardiovascular risk but is missed by clinic measurements." },
      { id: 7, question: "First line drug for Hypertension in African Americans:", options: ["ACE Inhibitor", "Beta Blocker", "Thiazide or CCB", "Loop Diuretic"], correctIndex: 2, explanation: "Thiazides and CCBs are more effective in this population unless CKD is present." },
      { id: 8, question: "Labetalol is a:", options: ["Selective Beta-1 blocker", "Non-selective Beta blocker + Alpha blocker", "Alpha blocker only", "Calcium channel blocker"], correctIndex: 1, explanation: "Combined Alpha/Beta blockade makes it potent for hypertensive emergencies." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod10",
    title: "Module 10: STEMI",
    overview: [
      "Diagnosis: ST Elevation >1mm in 2 contiguous leads (or new LBBB).",
      "Reperfusion: PCI < 90min (Door-to-Balloon). Fibrinolysis if >120min.",
      "Inferior MI (II, III, aVF): Right Ventricular involvement. Avoid Nitrates.",
      "Complications: VSD (Murmur), Free Wall Rupture (Tamponade/Shock), Papillary Rupture."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Acute Management</h3>
      <p class="mb-4 text-lg">
      <strong>MONA-BASH:</strong> Morphine (select cases), Oxygen (if Sat<90%), Nitrates, Aspirin (325mg chewed). Beta-Blocker, ACE-I, Statin, Heparin.
      <br/><br/>
      <strong>Reperfusion Strategy (Time is Muscle):</strong>
      <br/>- <strong>PCI Center:</strong> Goal Door-to-Balloon < 90 mins.
      <br/>- <strong>Non-PCI Center:</strong> Transfer if PCI possible within 120 mins. If not, administer <strong>Fibrinolytics (tPA)</strong> within 30 mins (Door-to-Needle).
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Right Ventricular Infarction</h3>
      <p class="mb-4 text-lg">
      Occurs in 30-50% of Inferior MIs (RCA occlusion).
      <br/>- <strong>Triad:</strong> Hypotension + Clear Lungs + JVD.
      <br/>- <strong>Dx:</strong> Right-sided ECG (Lead V4R shows STE).
      <br/>- <strong>Tx:</strong> Preload Dependent! <strong>Avoid Nitrates/Diuretics.</strong> Give IV Fluids aggressively.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. Mechanical Complications (3-5 Days)</h3>
      <p class="mb-4 text-lg">
      Present as sudden shock/pulmonary edema.
      <br/>- <strong>Papillary Muscle Rupture:</strong> Acute severe MR. Loud holosystolic murmur.
      <br/>- <strong>Ventricular Septal Rupture (VSD):</strong> L->R shunt. Harsh LSB murmur + Thrill. O2 Step-up in RV.
      <br/>- <strong>Free Wall Rupture:</strong> Tamponade -> PEA Arrest -> Death.
      </p>
    `,
    detailedContent: `
      <h3>Diagnosis</h3>
      <p>ST elevation ≥1 mm in two contiguous leads (≥2 mm in V2-V3). New LBBB.</p>

      <h3>Treatment</h3>
      <ul>
        <li><strong>Initial:</strong> Aspirin (325mg), P2Y12 inhibitor, Anticoagulant (Heparin).</li>
        <li><strong>Reperfusion:</strong> Primary PCI preferred (Goal < 90 min). Fibrinolysis if PCI > 120 min away (Goal < 30 min).</li>
        <li><strong>Meds:</strong> Beta blockers (IV if HTN, PO if stable), ACE inhibitor (esp if anterior MI or EF < 40%), Statins.</li>
      </ul>

      <h3>Complications</h3>
      <ul>
        <li><strong>Cardiogenic Shock:</strong> Hypotension, Oliguria, Confusion. Tx: Pressors, IABP.</li>
        <li><strong>Right Ventricular MI:</strong> Inferior MI + Hypotension + JVD + Clear Lungs. Dx: ST elevation in V4R. Tx: Volume loading. Avoid nitrates.</li>
        <li><strong>Mechanical:</strong> VSD (Systolic murmur, O2 step up), Mitral Regurg (Papillary rupture), Free wall rupture (Tamponade).</li>
        <li><strong>Arrhythmias:</strong> VT/VF (Defibrillate), AV Block (Atropine/Pacing - common in Inferior MI).</li>
      </ul>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "Door-to-Balloon time goal for Primary PCI is:", options: ["< 30 min", "< 60 min", "< 90 min", "< 120 min"], correctIndex: 2, explanation: "Guidelines recommend < 90 minutes for PCI centers." },
      { id: 2, question: "Which medication should be avoided in RV Infarction?", options: ["IV Fluids", "Aspirin", "Nitroglycerin", "Heparin"], correctIndex: 2, explanation: "RV infarcts are preload dependent. Nitrates dilate veins, dropping preload and causing severe hypotension." },
      { id: 3, question: "New loud holosystolic murmur and shock 4 days post-MI suggests:", options: ["VSD or Papillary Rupture", "Free Wall Rupture", "Pericarditis", "Recurrent MI"], correctIndex: 0, explanation: "Both VSD and MR cause systolic murmurs and shock. Free wall rupture causes tamponade (no murmur)." },
      { id: 4, question: "ST Elevation in leads II, III, aVF indicates infarction of:", options: ["Anterior Wall", "Lateral Wall", "Inferior Wall", "Posterior Wall"], correctIndex: 2, explanation: "Inferior wall, usually supplied by the RCA." },
      { id: 5, question: "Absolute contraindication to fibrinolysis:", options: ["Age > 75", "Prior Ischemic Stroke (3 months ago)", "Active Peptic Ulcer", "Hypertension 160/90"], correctIndex: 1, explanation: "Prior stroke within 3 months is an absolute contraindication due to bleed risk." },
      { id: 6, question: "Posterior MI is suggested by:", options: ["ST Elevation V1-V2", "ST Depression and Tall R waves in V1-V2", "ST Elevation I and aVL", "Deep Q waves in II, III, aVF"], correctIndex: 1, explanation: "Anterior leads V1/V2 see the posterior wall as a 'mirror'. ST depression corresponds to posterior ST elevation." },
      { id: 7, question: "Ventricular Free Wall Rupture typically presents as:", options: ["New murmur and pulmonary edema", "Sudden PEA Arrest and Tamponade", "Atrial Fibrillation", "High degree AV block"], correctIndex: 1, explanation: "Blood rushes into pericardial space causing acute tamponade and electromechanical dissociation (PEA)." },
      { id: 8, question: "Wellens' Sign on ECG indicates:", options: ["Critical proximal LAD stenosis", "RCA occlusion", "Pericarditis", "Digoxin toxicity"], correctIndex: 0, explanation: "Biphasic or Deeply inverted T waves in V2-V3 during a pain-free interval warn of impending massive Anterior MI." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod11",
    title: "Module 11: NSTEMI & Stable Angina",
    overview: [
      "NSTEMI: +Troponin, No STE. ST Depression/T-inversion.",
      "Stable Angina: Exertional CP relieved by rest/NTG. Demand ischemia.",
      "Prinzmetal: Vasospasm. Transient STE at rest. Tx: CCB/Nitrates.",
      "Treatment: Antiplatelets (DAPT), Anticoagulation, Statins, Anti-anginals."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. NSTEMI / Unstable Angina</h3>
      <p class="mb-4 text-lg">
      Partial occlusion (thrombus).
      <br/>- <strong>Risk Stratification (TIMI/GRACE):</strong> High risk -> Early Invasive (Cath < 24h). Low risk -> Conservative (Stress Test).
      <br/>- <strong>Medications:</strong> Aspirin + P2Y12 (Clopidogrel/Ticagrelor) + Anticoagulant (Heparin/LMWH) + Beta Blocker + High-intensity Statin. <strong>NO Fibrinolytics.</strong>
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Chronic Stable Angina</h3>
      <p class="mb-4 text-lg">
      Fixed stenosis. Mismatch of supply/demand.
      <br/>- <strong>Gold Standard Dx:</strong> Coronary Angiography.
      <br/>- <strong>Medical Rx:</strong> Beta Blockers (1st line, target HR 55-60), CCBs, Nitrates, Ranolazine.
      <br/>- <strong>Revascularization (CABG vs PCI):</strong> CABG preferred if Left Main disease, 3-vessel disease, or Diabetes with multivessel disease.
      </p>
    `,
    detailedContent: `
      <h3>Unstable Angina / NSTEMI</h3>
      <ul>
        <li><strong>Definition:</strong> Angina at rest or increasing frequency. NSTEMI has positive biomarkers.</li>
        <li><strong>Treatment:</strong> Anti-ischemic (Nitrates, Beta blockers), Anti-platelet (Aspirin + P2Y12), Anticoagulant (LMWH/Heparin).</li>
        <li><strong>Strategy:</strong> Invasive (Cath) for high risk (Refractory angina, elevated Troponin, ST depression). Conservative for low risk. NO Fibrinolytics.</li>
      </ul>

      <h3>Chronic Stable Angina</h3>
      <ul>
        <li><strong>Symptoms:</strong> Exertional chest pain relieved by rest/NTG.</li>
        <li><strong>Testing:</strong> Stress Test (Exercise or Pharmacologic) -> Cath.</li>
        <li><strong>Treatment:</strong> Risk factor modification. Aspirin, Statins. Anti-anginals: Beta blockers (Goal HR 55-60), CCB, Nitrates, Ranolazine.</li>
        <li><strong>Revascularization:</strong> PCI vs CABG (CABG for Left Main, 3-vessel, or Diabetics).</li>
      </ul>

      <h3>Prinzmetal's Variant Angina</h3>
      <p>Coronary vasospasm. Transient ST elevation at rest. Treatment: Calcium Channel Blockers and Nitrates.</p>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "Which therapy is contraindicated in NSTEMI?", options: ["Heparin", "Aspirin", "Fibrinolysis (tPA)", "Beta Blockers"], correctIndex: 2, explanation: "Fibrinolysis is harmful in NSTEMI (increases mortality/bleeding without benefit). It is only for STEMI." },
      { id: 2, question: "First line anti-anginal for Chronic Stable Angina:", options: ["Nitrates", "Beta Blockers", "Ranolazine", "CCB"], correctIndex: 1, explanation: "Beta blockers reduce mortality and symptoms." },
      { id: 3, question: "Indication for CABG over PCI:", options: ["1 vessel disease", "Left Main Disease", "Refractory Angina", "Acute STEMI"], correctIndex: 1, explanation: "Left Main or 3-vessel disease (esp with Diabetes) has better survival with CABG." },
      { id: 4, question: "Treatment of choice for Prinzmetal's Angina:", options: ["Beta Blockers", "Calcium Channel Blockers", "Aspirin", "Warfarin"], correctIndex: 1, explanation: "CCBs prevent vasospasm. Beta blockers can worsen it." },
      { id: 5, question: "TIMI Risk Score predicts:", options: ["Risk of Bleeding", "Mortality/Ischemic events in 14 days", "Need for CABG", "Risk of Stroke"], correctIndex: 1, explanation: "Used to triage UA/NSTEMI patients to invasive vs conservative strategy." },
      { id: 6, question: "HEART Score components include:", options: ["History, ECG, Age, Risk factors, Troponin", "Hypertension, Edema, Age, Rate, Troponin", "History, Echo, Age, Race, Troponin", "None of the above"], correctIndex: 0, explanation: "Used to risk stratify chest pain in the ER." },
      { id: 7, question: "Side effect of Ranolazine:", options: ["Bradycardia", "Hypotension", "QT Prolongation", "Bronchospasm"], correctIndex: 2, explanation: "It inhibits the late sodium current but can prolong QT." },
      { id: 8, question: "Duration of Dual Antiplatelet Therapy (DAPT) after Drug Eluting Stent (DES):", options: ["1 month", "6-12 months", "Indefinite", "Not needed"], correctIndex: 1, explanation: "Typically 12 months for ACS, 6 months for Stable CAD to prevent stent thrombosis." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod12",
    title: "Module 12: Arrhythmias",
    overview: [
      "Bradycardia: Symptomatic? Atropine/Pacing. Mobitz II/3rd Deg = Pacer.",
      "Atrial Fibrillation: Rate Control (BB/CCB) vs Rhythm. Anticoag (CHA2DS2-VASc).",
      "SVT: Vagal -> Adenosine. WPW: Avoid AV blockers (ABCD).",
      "VT: Unstable = Shock. Stable = Amiodarone/Lidocaine.",
      "Torsades: Magnesium. Overdrive pacing."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Atrial Fibrillation</h3>
      <p class="mb-4 text-lg">
      "Irregularly Irregular". Loss of atrial kick.
      <br/>- <strong>Rate Control:</strong> Beta Blockers, Non-DHP CCB (Diltiazem/Verapamil), Digoxin.
      <br/>- <strong>Rhythm Control:</strong> Cardioversion (Electric/Chemical). *Must rule out LA thrombus (TEE) or anticoagulate 3wks prior if >48h duration.*
      <br/>- <strong>Anticoagulation:</strong> CHA2DS2-VASc Score.
      <br/>  (CHF, HTN, Age>75 [2], DM, Stroke [2], Vasc Dz, Age 65-74, Sex F). Score ≥2 (M) or ≥3 (F) -> DOAC/Warfarin.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Wide Complex Tachycardia</h3>
      <p class="mb-4 text-lg">
      <strong>VT vs SVT w/ Aberrancy:</strong> Assume VT if history of MI/CHF.
      <br/>- <strong>VT Criteria:</strong> AV Dissociation (P waves march through QRS), Fusion beats, Capture beats, Extreme Axis, Concordance in precordial leads.
      <br/>- <strong>Tx:</strong> Unstable -> Synch Cardioversion. Stable -> Amiodarone, Procainamide.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">3. AV Blocks</h3>
      <p class="mb-4 text-lg">
      - <strong>1st Deg:</strong> PR > 200ms. Benign.
      <br/>- <strong>Mobitz I (Wenckebach):</strong> PR lengthens until drop. Benign.
      <br/>- <strong>Mobitz II:</strong> Constant PR with random drops. Pathologic (His-Purkinje disease). High risk of progression to complete block. <strong>Needs Pacemaker.</strong>
      <br/>- <strong>3rd Degree:</strong> P and QRS independent. <strong>Needs Pacemaker.</strong>
      </p>
    `,
    detailedContent: `
      <h3>Bradyarrhythmias</h3>
      <ul>
        <li><strong>Sinus Node Dysfunction:</strong> Pacemaker if symptomatic.</li>
        <li><strong>AV Block:</strong>
          <ul>
            <li>First Degree: Observation.</li>
            <li>Mobitz I (Wenckebach): Observation/Atropine.</li>
            <li>Mobitz II: Pacemaker (High risk of progression).</li>
            <li>Third Degree: Pacemaker.</li>
          </ul>
        </li>
      </ul>

      <h3>Tachyarrhythmias</h3>
      <ul>
        <li><strong>Sinus Tach:</strong> Treat underlying cause.</li>
        <li><strong>Atrial Fibrillation:</strong> Rate control (BB, CCB, Digoxin) or Rhythm control (Cardioversion, Amiodarone, Ablation). Anticoagulation based on CHA2DS2-VASc.</li>
        <li><strong>Atrial Flutter:</strong> Ablation.</li>
        <li><strong>PSVT:</strong> Vagal maneuvers -> Adenosine.</li>
        <li><strong>WPW:</strong> Procainamide for wide complex. Avoid AV blockers (Adenosine, BB, CCB, Digoxin). Ablation.</li>
        <li><strong>Ventricular Tachycardia:</strong> Unstable -> Shock. Stable -> Amiodarone/Lidocaine.</li>
        <li><strong>Torsades:</strong> Magnesium.</li>
        <li><strong>VF:</strong> Defibrillation.</li>
      </ul>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "Treatment for unstable VT is:", options: ["Adenosine", "Amiodarone", "Synchronized Cardioversion", "Defibrillation"], correctIndex: 2, explanation: "Unstable tachycardia with a pulse requires synchronized cardioversion. Defibrillation is for pulseless arrest." },
      { id: 2, question: "Which AV block requires a pacemaker?", options: ["First Degree", "Mobitz I", "Mobitz II", "Sinus Bradycardia"], correctIndex: 2, explanation: "Mobitz II indicates disease below the AV node (His-Purkinje) and frequently progresses to complete heart block." },
      { id: 3, question: "Drug of choice for Torsades de Pointes:", options: ["Amiodarone", "Magnesium Sulfate", "Adenosine", "Digoxin"], correctIndex: 1, explanation: "Magnesium stabilizes the membrane." },
      { id: 4, question: "In WPW with Atrial Fibrillation, which drug is CONTRAINDICATED?", options: ["Procainamide", "Ibutilide", "Diltiazem", "Amiodarone"], correctIndex: 2, explanation: "AV nodal blockers (ABCD: Adenosine, Beta blockers, CCB, Digoxin) force conduction down the accessory pathway, which can lead to VF." },
      { id: 5, question: "CHA2DS2-VASc score of 0 indicates:", options: ["High risk, Start Warfarin", "No antithrombotic therapy needed", "Start Aspirin", "Start Clopidogrel"], correctIndex: 1, explanation: "Low risk. No anticoagulation needed." },
      { id: 6, question: "Multifocal Atrial Tachycardia (MAT) is most often associated with:", options: ["COPD", "Ischemic Heart Disease", "Rheumatic Heart Disease", "Alcohol"], correctIndex: 0, explanation: "MAT (>3 P wave morphologies) is triggered by hypoxia and lung disease." },
      { id: 7, question: "Ashman Phenomenon refers to:", options: ["Wide QRS aberrancy in AF", "Short PR in WPW", "ST elevation in Brugada", "QT prolongation"], correctIndex: 0, explanation: "A long R-R interval followed by a short R-R interval causes the second beat to conduct with aberrancy (usually RBBB morphology) because the bundle was still refractory." },
      { id: 8, question: "Mechanism of action of Adenosine:", options: ["Sodium channel blocker", "Potassium channel blocker", "Transient AV node block", "Beta blocker"], correctIndex: 2, explanation: "Causes transient complete heart block to terminate re-entrant SVT." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod13",
    title: "Module 13: Heart Failure",
    overview: [
      "HFrEF (EF<40%): GDMT reduces mortality (BB, ARNI/ACE, MRA, SGLT2).",
      "HFpEF: Diuretics for symptoms. Manage comorbidities (HTN, AF).",
      "Acute Decompensated HF: Warm/Cold + Wet/Dry profiles.",
      "Cor Pulmonale: RV failure due to Lung Dz. Loud P2, TR murmur, Peripheral Edema."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Guideline Directed Medical Therapy (HFrEF)</h3>
      <p class="mb-4 text-lg">
      Therapies proven to reduce mortality:
      <br/>1. <strong>Beta Blockers:</strong> (Carvedilol, Metoprolol Succinate, Bisoprolol). Prevent remodeling.
      <br/>2. <strong>RAAS Inhibition:</strong> ARNI (Entresto) > ACEi/ARB.
      <br/>3. <strong>MRA:</strong> Spironolactone/Eplerenone. (Monitor K+).
      <br/>4. <strong>SGLT2 Inhibitors:</strong> Empagliflozin/Dapagliflozin.
      <br/><em>Note: Diuretics provide symptom relief but no mortality benefit.</em>
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Acute HF Profiles (Forrester)</h3>
      <p class="mb-4 text-lg">
      Based on Perfusion (Warm/Cold) and Congestion (Dry/Wet).
      <br/>- <strong>Warm & Wet (Most Common):</strong> Good perfusion, Pulmonary Edema. Tx: Diuretics + Vasodilators.
      <br/>- <strong>Cold & Wet (Cardiogenic Shock):</strong> Poor perfusion, Edema. Tx: Inotropes (Dobutamine/Milrinone) + Diuretics.
      <br/>- <strong>Cold & Dry:</strong> Hypovolemic or severe low output.
      </p>
    `,
    detailedContent: `
      <h3>Chronic Heart Failure</h3>
      <ul>
        <li><strong>HFrEF (Systolic):</strong> ACEi/ARB/ARNI + Beta Blocker + MRA + SGLT2i (4 pillars). Diuretics for symptoms. Digoxin for refractory symptoms. ICD/CRT if indicated.</li>
        <li><strong>HFpEF (Diastolic):</strong> Diuretics, manage HTN/AF. SGLT2i.</li>
      </ul>

      <h3>Acute Decompensated HF</h3>
      <ul>
        <li><strong>Warm and Wet:</strong> Diuretics + Vasodilators (Nitrates).</li>
        <li><strong>Cold and Wet (Shock):</strong> Inotropes (Dobutamine, Milrinone) + Diuretics. Pressors if hypotensive.</li>
      </ul>

      <h3>Cor Pulmonale</h3>
      <p>RV failure due to lung disease (COPD, PAH). Loud P2, TR, Edema. Treatment: Oxygen, treat lung disease, diuretics.</p>
    `,
    visuals: [],
    scenes: [
      {
        id: "shock_sim",
        title: "Forrester Hemodynamic Profiler",
        description: "Map clinical signs to Hemodynamics (CI/PCWP) to determine therapy.",
        objects: ["Chart"],
        controls: [
          { id: 'ci', label: 'Cardiac Index (L/min/m²)', type: 'slider', min: 1.0, max: 4.0, step: 0.1, defaultValue: 2.5 },
          { id: 'pcwp', label: 'PCWP (mmHg)', type: 'slider', min: 5, max: 35, defaultValue: 15 }
        ],
        learningOutcome: "Identify the quadrant: Warm/Wet needs Diuresis. Cold/Wet needs Inotropes.",
        renderLogic: renderShockSim
      }
    ],
    tables: [],
    quiz: [
      { id: 1, question: "Which medication reduces mortality in HFrEF?", options: ["Furosemide", "Digoxin", "Spironolactone", "Amlodipine"], correctIndex: 2, explanation: "Aldosterone antagonists reduce mortality. Diuretics and Digoxin improve symptoms/hospitalizations but not survival." },
      { id: 2, question: "Patient with HF, BP 80/50, Cool extremities, Crackles. Profile is:", options: ["Warm and Dry", "Warm and Wet", "Cold and Dry", "Cold and Wet"], correctIndex: 3, explanation: "Cold (Hypoperfusion) and Wet (Congestion). Cardiogenic Shock." },
      { id: 3, question: "First line therapy for 'Warm and Wet' decompensation:", options: ["Inotropes", "IV Diuretics", "Beta Blockers", "Fluids"], correctIndex: 1, explanation: "Volume overload requires diuresis." },
      { id: 4, question: "Cor Pulmonale is:", options: ["LV failure causing RV failure", "RV failure due to lung disease", "Congenital Heart Disease", "Primary Valvular Disease"], correctIndex: 1, explanation: "Right heart failure typically caused by Pulmonary Hypertension from lung pathology." },
      { id: 5, question: "Which beta blocker is NOT approved for HFrEF?", options: ["Carvedilol", "Metoprolol Succinate", "Bisoprolol", "Atenolol"], correctIndex: 3, explanation: "Only Carvedilol, Bisoprolol, and Metoprolol Succinate (XL) have evidence for mortality benefit." },
      { id: 6, question: "Sacubitril acts by inhibiting:", options: ["ACE", "Neprilysin", "Aldosterone", "Renin"], correctIndex: 1, explanation: "Neprilysin inhibition prevents the breakdown of Natriuretic Peptides (BNP), promoting diuresis and vasodilation." },
      { id: 7, question: "Cardiac Resynchronization Therapy (CRT) is indicated for:", options: ["EF < 35% and QRS > 150ms (LBBB)", "EF < 35% and Normal QRS", "AF with RVR", "Diastolic Failure"], correctIndex: 0, explanation: "Biventricular pacing resynchronizes septal and lateral wall contraction in LBBB." },
      { id: 8, question: "Ivabradine is used when:", options: ["HR > 70 despite max Beta Blocker", "Atrial Fibrillation", "Acute Decompensation", "BP is low"], correctIndex: 0, explanation: "It inhibits the If current in the sinus node to slow HR without affecting BP." }
    ],
    vignettes: [],
    mnemonics: []
  },
  {
    id: "mod14",
    title: "Module 14: Aorta & Peripheral Vascular",
    overview: [
      "Aortic Dissection: Tearing chest/back pain. Mediastinal widening. Type A=Surgery.",
      "AAA: Repair if >5.5cm (men) or >5.0cm (women) or rapid expansion.",
      "PAD: Claudication. ABI < 0.9. Cilostazol. Critical Limb Ischemia (Rest pain).",
      "Pulmonary HTN: Mean PAP > 20 mmHg. Group 1 (PAH) vs Group 2 (Left Heart)."
    ],
    explainer: `
      <h3 class="text-2xl font-bold text-slate-900 mb-4">1. Aortic Dissection</h3>
      <p class="mb-4 text-lg">
      Intimal tear allows blood into media (false lumen).
      <br/>- <strong>Risk Factors:</strong> HTN (most common), Marfan, Ehlers-Danlos, Bicuspid Aortic Valve, Cocaine.
      <br/>- <strong>Clinical:</strong> Sudden tearing chest/back pain. Pulse asymmetry > 20mmHg. Diastolic murmur (AR).
      <br/>- <strong>Stanford Classification:</strong>
      <br/>  * <strong>Type A (Ascending):</strong> Surgical Emergency. Risk of tamponade, coronary occlusion, stroke.
      <br/>  * <strong>Type B (Descending):</strong> Medical Management. Impulse control (IV Beta Blockers - Esmolol/Labetalol) then Vasodilators (Nitroprusside). Target SBP 100-120, HR < 60.
      </p>

      <h3 class="text-2xl font-bold text-slate-900 mb-4">2. Peripheral Artery Disease (PAD)</h3>
      <p class="mb-4 text-lg">
      Atherosclerosis of lower extremities.
      <br/>- <strong>Symptoms:</strong> Intermittent Claudication (pain w/ exertion, relieved by rest).
      <br/>- <strong>Diagnosis:</strong> Ankle-Brachial Index (ABI). < 0.9 is abnormal. < 0.4 is Critical Ischemia.
      <br/>- <strong>Acute Limb Ischemia (6 P's):</strong> Pain, Pallor, Pulselessness, Paresthesia, Paralysis, Poikilothermia. <strong>Emergency Heparin + Embolectomy.</strong>
      </p>
    `,
    detailedContent: `
      <h3>Aortic Aneurysm</h3>
      <ul>
        <li><strong>Thoracic:</strong> Degenerative, Marfan's. Repair if >5.5 cm (>4-5cm in Marfan).</li>
        <li><strong>Abdominal (AAA):</strong> Atherosclerotic. Palpable mass. Screen men 65-75 who smoked. Repair if >5.5 cm or rapid expansion.</li>
      </ul>

      <h3>Aortic Dissection</h3>
      <ul>
        <li><strong>Type A (Ascending):</strong> Emergency Surgery.</li>
        <li><strong>Type B (Descending):</strong> Medical (Beta blockers + Nitroprusside).</li>
        <li><strong>Signs:</strong> Pulse deficit, AR murmur, widened mediastinum on CXR.</li>
      </ul>

      <h3>Peripheral Vascular Disease</h3>
      <ul>
        <li><strong>PAD:</strong> Claudication. ABI < 0.9. Treatment: Exercise, Cilostazol, Statin, Antiplatelet.</li>
        <li><strong>Acute Ischemia:</strong> Embolism vs Thrombus. 6 P's. Heparin -> Surgery.</li>
      </ul>

      <h3>Pulmonary Hypertension</h3>
      <ul>
        <li><strong>Definition:</strong> Mean PA pressure > 20 mmHg.</li>
        <li><strong>Groups:</strong> 1 (PAH), 2 (Left Heart - most common), 3 (Lung), 4 (TE), 5 (Misc).</li>
        <li><strong>Treatment (Group 1):</strong> CCB (if responsive), Endothelin antagonists, PDE5 inhibitors, Prostacyclins.</li>
      </ul>
    `,
    visuals: [],
    scenes: [],
    tables: [],
    quiz: [
      { id: 1, question: "60yo male with sudden tearing back pain. BP 190/110. CT shows dissection distal to left subclavian. Initial step?", options: ["Emergent Surgery", "IV Hydralazine", "IV Beta Blockers", "Thrombolysis"], correctIndex: 2, explanation: "Type B Dissection (Descending) is treated medically. First line is Beta Blockers to reduce shear stress (dP/dt). Hydralazine increases shear stress (reflex tachy) and is contraindicated." },
      { id: 2, question: "Diagnostic test for AAA screening:", options: ["CT Scan", "Abdominal Ultrasound", "MRI", "Angiography"], correctIndex: 1, explanation: "Ultrasound is non-invasive, cheap, and highly sensitive for screening." },
      { id: 3, question: "ABI < 0.4 indicates:", options: ["Normal", "Mild PAD", "Severe/Critical Ischemia", "Calcified vessels"], correctIndex: 2, explanation: "Severe obstruction. Risk of rest pain and ulcers." },
      { id: 4, question: "Which of the following is NOT one of the 6 P's of Acute Limb Ischemia?", options: ["Pain", "Pallor", "Pulselessness", "Purpura"], correctIndex: 3, explanation: "The P's are Pain, Pallor, Pulselessness, Paresthesia, Paralysis, Poikilothermia." },
      { id: 5, question: "Group 2 Pulmonary Hypertension is caused by:", options: ["Lung Disease", "Left Heart Disease", "Chronic PE", "Idiopathic"], correctIndex: 1, explanation: "Group 2 is PVH due to Left Heart Disease (Systolic/Diastolic failure, Valvular disease)." },
      { id: 6, question: "Leriche Syndrome triad includes:", options: ["Claudication, Impotence, Absent femoral pulses", "Chest pain, Dyspnea, Syncope", "HTN, Bradycardia, Irregular breathing", "Fever, Murmur, Splinter hemorrhages"], correctIndex: 0, explanation: "Caused by occlusion of the distal abdominal aorta/iliac arteries." },
      { id: 7, question: "Cystic Medial Necrosis is the pathology underlying:", options: ["Atherosclerosis", "Marfan Syndrome / Aortic Dissection", "Giant Cell Arteritis", "Fibromuscular Dysplasia"], correctIndex: 1, explanation: "Degeneration of the aortic media predisposes to aneurysm and dissection." },
      { id: 8, question: "Subclavian Steal Syndrome presents with:", options: ["Syncope with arm exercise", "Leg pain with walking", "Abdominal pain after eating", "Flash pulmonary edema"], correctIndex: 0, explanation: "Stenosis of subclavian artery proximal to vertebral artery origin causes retrograde flow from vertebral to supply the arm, stealing blood from the brain." }
    ],
    vignettes: [],
    mnemonics: []
  }
];
