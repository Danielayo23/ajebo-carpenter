/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersDonutChart.tsx
   ========================================================= */

type Slice = { label: string; value: number; color: string };

function clamp(n: number) {
  return Number.isFinite(n) ? n : 0;
}

export default function OrdersDonutChart({
  title = "Order Status Overview",
  centerValue,
  centerLabel = "Total Orders",
  slices,
}: {
  title?: string;
  centerValue: number;
  centerLabel?: string;
  slices: Slice[];
}) {
  const total = Math.max(
    1,
    slices.reduce((a, s) => a + clamp(s.value), 0)
  );

  const size = 220;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{title}</div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Donut */}
        <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-6">
          <div className="relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={stroke}
              />

              {/* Slices */}
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                {slices.map((s) => {
                  const v = clamp(s.value);
                  const dash = (v / total) * c;
                  const dasharray = `${dash} ${c - dash}`;
                  const dashoffset = -offset;
                  offset += dash;

                  return (
                    <circle
                      key={s.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={dasharray}
                      strokeDashoffset={dashoffset}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-bold text-gray-900">
                {centerValue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{centerLabel}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 text-sm">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-medium text-gray-600">{s.label}</span>
              </div>
              <span className="font-bold text-gray-900">
                {clamp(s.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}