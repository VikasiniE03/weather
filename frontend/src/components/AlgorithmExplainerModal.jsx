import React from "react";
import { X, Cpu, Compass, Activity, ShieldCheck, Layers, GitCompare } from "lucide-react";

export const AlgorithmExplainerModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-zinc-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 border border-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-zinc-200 pb-4">
          <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono text-zinc-500 font-semibold tracking-wider">
              Mathematical & Algorithmic Blueprint
            </div>
            <h2 className="text-xl font-bold text-zinc-900">
              Spatial-Temporal AI Sensor Anomaly Detection
            </h2>
          </div>
        </div>

        {/* 4 Architecture Steps */}
        <div className="space-y-5 text-sm">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center space-x-2 text-zinc-900 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>STAGE 1: Temporal Zero-Variance / Flatline Detection</span>
            </div>
            <p className="text-zinc-600 text-xs mt-2 leading-relaxed">
              Monitors incoming real-time telemetry time-series through a sliding temporal window of size <code className="text-zinc-800 bg-zinc-200 px-1 py-0.5 rounded font-mono">N = 5</code> consecutive cycles (25 seconds). 
              If the variance of readings <code className="text-zinc-800 bg-zinc-200 px-1 py-0.5 rounded font-mono">σ² &lt; 0.0001</code> and consecutive delta is identical (&lt; 0.001), the station enters zero-variance suspicion state.
            </p>
            <div className="mt-2.5 p-2 rounded bg-zinc-100 text-zinc-800 font-mono text-[11px] border border-zinc-200">
              ΔT = |T(t) - T(t-1)| &lt; 0.001  AND  Streak(identical) ≥ 5 cycles
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center space-x-2 text-zinc-900 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">
                2
              </span>
              <span>STAGE 2: Spatial Geodesic Clustering (Haversine Formula)</span>
            </div>
            <p className="text-zinc-600 text-xs mt-2 leading-relaxed">
              Computes pairwise great-circle distance between the suspected station and all monitoring stations across Chennai on the WGS-84 Earth sphere (R = 6,371 km).
              Filters stations within a configurable correlation perimeter (<code className="text-zinc-800 bg-zinc-200 px-1 py-0.5 rounded font-mono">radius ≤ 15 km</code>).
            </p>
            <div className="mt-2.5 p-2 rounded bg-zinc-100 text-zinc-800 font-mono text-[11px] border border-zinc-200">
              d = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center space-x-2 text-zinc-900 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>STAGE 3: Inverse Distance Weighting (IDW) Spatial Interpolation</span>
            </div>
            <p className="text-zinc-600 text-xs mt-2 leading-relaxed">
              Weights readings from nearest neighbors inversely proportional to their geodesic distance. 
              Estimates the synthetic expected ambient value <code className="text-zinc-800 bg-zinc-200 px-1 py-0.5 rounded font-mono">T̂_expected</code> and computes spatial divergence against the frozen sensor.
            </p>
            <div className="mt-2.5 p-2 rounded bg-zinc-100 text-zinc-800 font-mono text-[11px] border border-zinc-200">
              w_i = 1 / (d_i)^p   ⟹   T̂_expected = ∑(w_i · T_i) / ∑(w_i),  where p = 1.5
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center space-x-2 text-zinc-900 font-bold font-mono">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">
                4
              </span>
              <span>STAGE 4: Multi-Factor AI Confidence Scoring Model (0 - 100%)</span>
            </div>
            <p className="text-zinc-600 text-xs mt-2 leading-relaxed">
              Distinguishes between a true sensor failure and natural atmospheric stagnation by verifying whether neighbors show active ambient variance:
            </p>
            <ul className="mt-2 space-y-1 text-zinc-600 text-xs list-disc list-inside">
              <li><strong className="text-zinc-900">Streak Duration Factor (45% - 65%):</strong> Escalates as streak extends past 5 cycles.</li>
              <li><strong className="text-zinc-900">Spatial Divergence Factor (0% - 22%):</strong> Penalty proportional to |T_stuck - T̂_expected|.</li>
              <li><strong className="text-zinc-900">Environmental Dynamic Discrepancy (0% - 15%):</strong> Awarded when neighbors show active variance (σ &gt; 0.1) while target is flatlined.</li>
            </ul>
            <div className="mt-2.5 p-2 rounded bg-zinc-100 text-zinc-800 font-mono text-[11px] border border-zinc-200">
              Score = min(99.2%, C_streak + C_divergence + C_dynamics)  [Triggered if ≥ 65%]
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
