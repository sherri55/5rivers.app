import { useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import { addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { parseLocalDate } from "@/src/lib/utils";

interface Props {
  value: { startDate: Date | null; endDate: Date | null };
  onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selectionRange = {
    startDate: value.startDate || new Date(),
    endDate: value.endDate || new Date(),
    key: "selection",
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="border rounded px-2 py-1 "
        onClick={() => setOpen((v) => !v)}
      >
        {value.startDate && value.endDate
          ? `${value.startDate.toLocaleDateString()} - ${value.endDate.toLocaleDateString()}`
          : "Select Date Range"}
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 10 }}>
          <DateRange
            ranges={[selectionRange]}
            onChange={(ranges: RangeKeyDict) => {
              const range = ranges.selection;
              onChange({
                startDate: range.startDate
                  ? parseLocalDate(range.startDate.toISOString().slice(0, 10))
                  : null,
                endDate: range.endDate
                  ? parseLocalDate(range.endDate.toISOString().slice(0, 10))
                  : null,
              });
            }}
            maxDate={addDays(new Date(), 0)}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            rangeColors={["#2563eb"]}
            editableDateInputs={true}
          />
          <button
            type="button"
            className="mt-2 border rounded px-2 py-1 bg-blue-600 text-white"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
