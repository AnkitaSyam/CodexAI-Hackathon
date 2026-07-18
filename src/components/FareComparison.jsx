export function FareComparison({ riderCount = 2 }) {
  const totalAutoFare = 40
  const pooledFarePerRider = Math.ceil(totalAutoFare / riderCount)
  const soloAutoFare = 120
  const uberTaxiFare = 220
  const savingsPerRider = soloAutoFare - pooledFarePerRider
  const savingsPercent = Math.round((savingsPerRider / soloAutoFare) * 100)

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-4 backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Estimated Fare Comparison
          </h4>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
          Save {savingsPercent}% per rider
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {/* Pooled Auto - Best Value */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 rounded-bl bg-emerald-500 text-[9px] font-extrabold text-slate-950 px-1.5 py-0.2">
            Best
          </div>
          <span className="block text-[10px] font-medium text-emerald-300">CoRide Shared</span>
          <span className="mt-1 block text-lg font-black text-emerald-200">
            ₹{pooledFarePerRider}
          </span>
          <span className="text-[9px] text-emerald-400/80">each ({riderCount} riders)</span>
        </div>

        {/* Solo Auto */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <span className="block text-[10px] font-medium text-slate-400">Solo Auto</span>
          <span className="mt-1 block text-base font-bold text-slate-300">
            ₹{soloAutoFare}
          </span>
          <span className="text-[9px] text-slate-500">single rider</span>
        </div>

        {/* Uber / Cab */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <span className="block text-[10px] font-medium text-slate-400">Uber / Cab</span>
          <span className="mt-1 block text-base font-bold text-slate-300">
            ₹{uberTaxiFare}
          </span>
          <span className="text-[9px] text-slate-500">estimated fare</span>
        </div>
      </div>
    </div>
  )
}

export default FareComparison
