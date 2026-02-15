"use client";

import { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfDay,
  differenceInCalendarDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
} from "lucide-react";
import { getDailyCounts } from "@/app/actions";

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function DatePicker({
  selectedDate,
  onChange,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate + "T09:00:00"),
  );
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>(
    {},
  );

  const formattedSelected = selectedDate ? parseISO(selectedDate) : new Date();

  const getDateRangeStyles = (day: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      return {
        cell: "bg-gray-100 text-gray-400",
        dayChip: "text-gray-500 bg-gray-200",
      };
    }

    const today = startOfDay(new Date());
    const target = startOfDay(day);
    const diff = differenceInCalendarDays(target, today);

    if (diff < 0) {
      return {
        cell: "bg-slate-100/80 text-slate-500",
        dayChip: "text-slate-600 bg-slate-200",
      };
    }
    if (diff === 0) {
      return {
        cell: "bg-blue-50 text-blue-900",
        dayChip: "text-blue-700 bg-blue-100",
      };
    }
    if (diff <= 7) {
      return {
        cell: "bg-emerald-50/70 text-emerald-900",
        dayChip: "text-emerald-700 bg-emerald-100",
      };
    }
    if (diff <= 30) {
      return {
        cell: "bg-amber-50/70 text-amber-900",
        dayChip: "text-amber-700 bg-amber-100",
      };
    }
    return {
      cell: "bg-violet-50/70 text-violet-900",
      dayChip: "text-violet-700 bg-violet-100",
    };
  };

  const getCountBadgeStyles = (count: number) => {
    if (count > 35) return "bg-red-100 text-red-700";
    if (count > 25) return "bg-rose-100 text-rose-700";
    if (count > 15) return "bg-orange-100 text-orange-700";
    if (count >= 1) return "bg-green-100 text-green-700";
    return "bg-gray-200 text-gray-600";
  };

  useEffect(() => {
    // Fetch counts for the current month view
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 6 }); // Start on Saturday
    const startDateStr = format(start, "yyyy-MM-dd");
    getDailyCounts(startDateStr, 42).then(setDailyCounts); // Fetch 6 weeks to cover any month
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy";
    return (
      <div className='flex items-center justify-between px-4 py-4 bg-gray-50/50 rounded-t-3xl border-b border-gray-100'>
        <button
          type='button'
          onClick={prevMonth}
          className='p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all hover:text-primary'
        >
          <ChevronLeft size={24} />
        </button>
        <div className='text-lg font-black text-gray-900 capitalize tracking-tight flex items-center gap-2'>
          <CalendarIcon size={20} className='text-primary opacity-50' />
          {format(currentMonth, dateFormat, { locale: fr })}
        </div>
        <button
          type='button'
          onClick={nextMonth}
          className='p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all hover:text-primary'
        >
          <ChevronRight size={24} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateNames = ["Sam", "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className='text-center text-[11px] font-black text-gray-400 uppercase tracking-widest py-3'
        >
          {dateNames[i]}
        </div>,
      );
    }
    return (
      <div className='grid grid-cols-7 border-b border-gray-50'>{days}</div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 6 }); // Saturday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 }); // Friday end (same as week start)

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "yyyy-MM-dd");
        const cloneDay = day;
        const isSelected = isSameDay(day, formattedSelected);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const count = dailyCounts[formattedDate] || 0;
        const isToday = isSameDay(day, new Date());
        const rangeStyles = getDateRangeStyles(day, isCurrentMonth);
        const isAtCapacity = count >= 60;
        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
        const isDisabled = isPast || isAtCapacity;

        days.push(
          <button
            key={day.toString()}
            type='button'
            disabled={isDisabled}
            onClick={() => onChange(format(cloneDay, "yyyy-MM-dd"))}
            className={`
                            relative h-24 p-2 flex flex-col items-center justify-start border-r border-b border-gray-100 transition-all hover:bg-gray-50
                            ${rangeStyles.cell}
                    ${isAtCapacity ? "cursor-not-allowed opacity-60" : ""}
                            ${isSelected ? "bg-blue-100 text-blue-900 z-10 border-2 border-blue-400 rounded-lg" : ""}
                        `}
          >
            <span
              className={`
                            text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl mb-1 transition-all
                            ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-300 scale-125" : ""}
                            ${!isSelected && isToday ? "text-blue-600 bg-blue-100 animate-pulse" : rangeStyles.dayChip}
                        `}
            >
              {format(day, "d")}
            </span>

            {isCurrentMonth && (
              <div
                className={`
                                mt-auto mb-1 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all
                                ${isAtCapacity ? "bg-red-200 text-red-900" : getCountBadgeStyles(count)}
                            `}
              >
                <Users size={10} />
                {count}
              </div>
            )}

            {isSelected && (
              <div className='absolute inset-x-1 bottom-1 h-1 bg-primary rounded-full animate-in fade-in zoom-in duration-300' />
            )}
          </button>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className='grid grid-cols-7' key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return <div className='bg-white'>{rows}</div>;
  };

  return (
    <div className='bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden select-none'>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
