"use client";

import { useState } from "react";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DatePicker({ value, onChange, min }: DatePickerProps) {
  const today = new Date();
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const minDate = min || todayStr;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDay(day: number) {
    const dateStr = toYMD(viewYear, viewMonth, day);
    const dow = new Date(dateStr + "T00:00:00").getDay();
    if (dow === 0 || dow === 6) return;
    if (dateStr < minDate) return;
    onChange(dateStr);
  }

  function getCellStyle(day: number): React.CSSProperties {
    const dateStr = toYMD(viewYear, viewMonth, day);
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isPast = dateStr < minDate;
    const isSelected = dateStr === value;
    const isToday = dateStr === todayStr;

    if (isSelected) return { background: "#ff6900", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: 600 };
    if (isWeekend || isPast) return { color: "#d1d5db", cursor: "not-allowed" };
    if (isToday) return { background: "#fff0e0", color: "#ff6900", borderRadius: "8px", cursor: "pointer", fontWeight: 600 };
    return { color: "#111827", cursor: "pointer" };
  }

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "Select a date";

  return (
    <div className="w-full">
      <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white mb-3 flex items-center justify-between">
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>{displayValue}</span>
        {value && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fff0e0", color: "#ff6900" }}>
            {new Date(value + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long" })}
          </span>
        )}
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: "#ffe0c0", background: "#fffaf7" }}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">{MONTHS[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: d === "Sun" || d === "Sat" ? "#d1d5db" : "#9ca3af" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => (
            <div
              key={i}
              onClick={() => day && handleDay(day)}
              className="flex items-center justify-center h-8 text-sm transition-all select-none"
              style={day ? getCellStyle(day) : {}}
            >
              {day || ""}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "#ffe0c0" }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#e5e7eb" }} />
            Weekends / Past
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#fff0e0", border: "1px solid #ff6900" }} />
            Today
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#ff6900" }} />
            Selected
          </div>
        </div>
      </div>
    </div>
  );
}
