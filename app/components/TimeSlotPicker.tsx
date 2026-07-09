"use client";

interface TimeSlotPickerProps {
  slots: string[];                              // all possible slots e.g. ["09:00","09:30",...]
  bookedRanges: { start: number; end: number }[]; // blocked minute ranges
  minTime: string;                              // earliest selectable e.g. "11:00"
  pickupTime: string;                           // currently selected pickup
  endTime: string;                              // currently selected end (round trip)
  tripType: "drop_off" | "round_trip";
  onPickupSelect: (t: string) => void;
  onEndSelect: (t: string) => void;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type SlotStatus = "booked" | "past" | "selected_pickup" | "selected_range" | "selected_end" | "available";

export default function TimeSlotPicker({
  slots,
  bookedRanges,
  minTime,
  pickupTime,
  endTime,
  tripType,
  onPickupSelect,
  onEndSelect,
}: TimeSlotPickerProps) {
  const pickupMin = pickupTime ? toMinutes(pickupTime) : null;
  const endMin = endTime ? toMinutes(endTime) : null;

  // The block that will be reserved if this booking goes through
  const reservedEnd = pickupMin !== null
    ? (tripType === "round_trip" && endMin ? endMin : pickupMin + 60)
    : null;

  function getStatus(slot: string): SlotStatus {
    const slotMin = toMinutes(slot);

    // Is it in a booked range?
    const isBooked = bookedRanges.some((r) => slotMin >= r.start && slotMin < r.end);
    if (isBooked) return "booked";

    // Is it past the min allowed time?
    if (slot < minTime) return "past";

    // Is it the selected pickup?
    if (pickupTime && slot === pickupTime) return "selected_pickup";

    // Is it the selected end time?
    if (endTime && slot === endTime) return "selected_end";

    // Is it in the selected range (between pickup and end/+1h)?
    if (pickupMin !== null && reservedEnd !== null) {
      if (slotMin > pickupMin && slotMin < reservedEnd) return "selected_range";
    }

    return "available";
  }

  function handleSlotClick(slot: string) {
    const status = getStatus(slot);
    if (status === "booked" || status === "past") return;

    if (tripType === "drop_off") {
      // Drop off: just select pickup
      onPickupSelect(slot === pickupTime ? "" : slot);
      return;
    }

    // Round trip logic
    if (!pickupTime) {
      // No pickup yet — set pickup
      onPickupSelect(slot);
      onEndSelect("");
      return;
    }

    if (slot === pickupTime) {
      // Deselect pickup
      onPickupSelect("");
      onEndSelect("");
      return;
    }

    if (slot < pickupTime) {
      // Clicked before pickup — move pickup
      onPickupSelect(slot);
      onEndSelect("");
      return;
    }

    // Clicked after pickup — check no booked range in between
    const slotMin = toMinutes(slot);
    const blocked = bookedRanges.some(
      (r) => toMinutes(pickupTime) < r.end && r.start < slotMin
    );
    if (blocked) return;

    // Set as end time
    onEndSelect(slot === endTime ? "" : slot);
  }

  function getStyle(status: SlotStatus, isHalfHour: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
      borderRadius: "8px",
      cursor: status === "booked" || status === "past" ? "not-allowed" : "pointer",
      transition: "all 0.15s",
      fontSize: isHalfHour ? "11px" : "12px",
      fontWeight: status === "selected_pickup" || status === "selected_end" ? 700 : 500,
    };

    switch (status) {
      case "booked":
        return { ...base, background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5" };
      case "past":
        return { ...base, background: "#f9fafb", color: "#d1d5db", border: "1px solid #f3f4f6" };
      case "selected_pickup":
        return { ...base, background: "#ff6900", color: "white", border: "1px solid #ff6900" };
      case "selected_end":
        return { ...base, background: "#ff6900", color: "white", border: "1px solid #ff6900" };
      case "selected_range":
        return { ...base, background: "#fff0e0", color: "#ff6900", border: "1px solid #ffcb99" };
      case "available":
        return { ...base, background: "white", color: "#374151", border: "1px solid #e5e7eb" };
    }
  }

  // Group slots by hour for rendering
  const hours: { hour: string; slots: string[] }[] = [];
  for (const slot of slots) {
    const h = slot.split(":")[0];
    const label = (() => {
      const hr = parseInt(h);
      const ampm = hr >= 12 ? "PM" : "AM";
      const hour = hr % 12 || 12;
      return `${hour} ${ampm}`;
    })();
    const existing = hours.find((x) => x.hour === label);
    if (existing) existing.slots.push(slot);
    else hours.push({ hour: label, slots: [slot] });
  }

  const hasPickup = !!pickupTime;
  const hasEnd = !!endTime;

  return (
    <div>
      {/* Instruction */}
      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
        <span>💡</span>
        {tripType === "drop_off"
          ? "Tap a slot to select pick-up time. Drop off blocks 1 hour."
          : !hasPickup
          ? "Tap a slot to select pick-up time."
          : !hasEnd
          ? "Now tap another slot to set return-to-office time."
          : "Pick-up and return time selected."}
      </div>

      {/* Selected summary */}
      {hasPickup && (
        <div className="rounded-lg px-3 py-2 mb-3 text-sm flex items-center gap-2" style={{ background: "#fff0e0", border: "1px solid #ffcb99" }}>
          <span style={{ color: "#ff6900" }}>🕐</span>
          <span className="text-gray-700">
            {tripType === "drop_off"
              ? <><strong>Pick-up:</strong> {fmt12(pickupTime)} <span className="text-gray-400">(driver back ~{fmt12(`${String(Math.floor((toMinutes(pickupTime) + 60) / 60)).padStart(2,"0")}:${String((toMinutes(pickupTime) + 60) % 60).padStart(2,"0")}`)})</span></>
              : hasEnd
              ? <><strong>Pick-up:</strong> {fmt12(pickupTime)} &nbsp;→&nbsp; <strong>Return:</strong> {fmt12(endTime)}</>
              : <><strong>Pick-up:</strong> {fmt12(pickupTime)} &nbsp;→&nbsp; <span className="text-gray-400">select return time</span></>
            }
          </span>
          <button
            type="button"
            onClick={() => { onPickupSelect(""); onEndSelect(""); }}
            className="ml-auto text-xs text-gray-400 hover:text-red-500"
          >✕ Clear</button>
        </div>
      )}

      {/* Slot grid */}
      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#ffe0c0", background: "#fffaf7" }}>
        {hours.map(({ hour, slots: hourSlots }) => (
          <div key={hour} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12 flex-shrink-0 text-right">{hour}</span>
            <div className="flex gap-1.5 flex-1">
              {hourSlots.map((slot) => {
                const status = getStatus(slot);
                const isHalf = slot.endsWith(":30");
                return (
                  <div
                    key={slot}
                    onClick={() => handleSlotClick(slot)}
                    style={getStyle(status, isHalf)}
                    className="flex-1 text-center py-1.5 select-none"
                    title={
                      status === "booked" ? "Already booked" :
                      status === "past" ? "Past / unavailable" :
                      fmt12(slot)
                    }
                  >
                    {isHalf ? ":30" : ":00"}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 mt-1 border-t flex-wrap" style={{ borderColor: "#ffe0c0" }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }} />
            Booked
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }} />
            Unavailable
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded" style={{ background: "#fff0e0", border: "1px solid #ffcb99" }} />
            Your block
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
