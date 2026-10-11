import React from "react";
import { X, Cpu, Compass, Activity, ShieldCheck, Layers, GitCompare } from "lucide-react";

export const AlgorithmExplainerModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0E1524] border border-[#1F2E45] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono text-cyan-400 font-semibold tracking-wider">
              Mathematical & Algorithmic Blueprint
            </div>
            <h2 className="text-xl font-bold text-white">
              Spatial-Temporal AI Sensor Anomaly Detection
            </h2>
          </div>
        </div>

        {/* 4 Architecture Steps */}
        <div className="space-y-5 text-sm">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-xs">
                1
              </span>
              <span>STAGE 1: Temporal Zero-Variance / Flatline Detection</span>
            </div>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              Monitors incoming real-time telemetry time-series through a sliding temporal window of size <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">N = 5</code> consecutive cycles (25 seconds). 
              If the variance of readings <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">σ² &lt; 0.0001</code> and consecutive delta is identical (&lt; 0.001°C), the station enters zero-variance suspicion state.
            </p>
            <div className="mt-2.5 p-2 rounded bg-slate-950 text-cyan-300 font-mono text-[11px] border border-slate-800">
              ΔT = |T(t) - T(t-1)| &lt; 0.001  AND  Streak(identical) ≥ 5 cycles
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                2
              </span>
              <span>STAGE 2: Spatial Geodesic Clustering (Haversine Formula)</span>
            </div>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              Computes pairwise great-circle distance between the suspected station and all monitoring stations across Chennai on the WGS-84 Earth sphere (R = 6,371 km).
              Filters stations within a configurable correlation perimeter (<code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">radius ≤ 15 km</code>).
            </p>
            <div className="mt-2.5 p-2 rounded bg-slate-950 text-indigo-300 font-mono text-[11px] border border-slate-800">
              d = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-amber-400 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-xs">
                3
              </span>
              <span>STAGE 3: Inverse Distance Weighting (IDW) Spatial Interpolation</span>
            </div>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              Weights readings from nearest neighbors inversely proportional to their geodesic distance. 
              Estimates the synthetic expected ambient value <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">T̂_expected</code> and computes spatial divergence against the frozen sensor.
            </p>
            <div className="mt-2.5 p-2 rounded bg-slate-950 text-amber-300 font-mono text-[11px] border border-slate-800">
              w_i = 1 / (d_i)^p   ⟹   T̂_expected = ∑(w_i · T_i) / ∑(w_i),  where p = 1.5
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2 text-rose-400 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-rose-950 border border-rose-500/40 flex items-center justify-center text-xs">
                4
              </span>
              <span>STAGE 4: Multi-Factor AI Confidence Scoring Model (0 - 100%)</span>
            </div>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              Distinguishes between a true sensor failure and natural atmospheric stagnation by verifying whether neighbors show active ambient variance:
            </p>
            <ul className="mt-2 space-y-1 text-slate-300 text-xs list-disc list-inside">
              <li><strong className="text-white">Streak Duration Factor (45% - 65%):</strong> Escalates as streak extends past 5 cycles.</li>
              <li><strong className="text-white">Spatial Divergence Factor (0% - 22%):</strong> Penalty proportional to |T_stuck - T̂_expected|.</li>
              <li><strong className="text-white">Environmental Dynamic Discrepancy (0% - 15%):</strong> Awarded when neighbors show active variance (σ &gt; 0.1°C) while target is flatlined.</li>
            </ul>
            <div className="mt-2.5 p-2 rounded bg-slate-950 text-rose-300 font-mono text-[11px] border border-slate-800">
              Score = min(99.2%, C_streak + C_divergence + C_dynamics)  [Triggered if ≥ 65%]
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
