export type WeekDay = "done" | "today" | "missed" | "future";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/** Semaine en cours du lundi au dimanche. */
export function weekDays(active: Set<string>, now: Date): WeekDay[] {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const key = dayKey(day);
    if (active.has(key)) return "done";
    if (key === today) return "today";
    return key < today ? "missed" : "future";
  });
}

export interface MonthCell {
  day: number | null;
  active: boolean;
  today: boolean;
}

/** Grille du mois, lundi en tête, cases vides avant le 1er. */
export function monthGrid(active: Set<string>, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = Array.from({ length: offset }, () => ({
    day: null,
    active: false,
    today: false,
  }));
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      day,
      active: active.has(dayKey(new Date(year, month, day))),
      today: day === now.getDate(),
    });
  }
  return {
    label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    cells,
    activeCount: cells.filter((cell) => cell.active).length,
  };
}
