export type ExerciseUnit = "reps" | "seconds" | "rounds";
export type ExerciseCategory =
  | "Strength"
  | "Core"
  | "Cardio"
  | "Yoga"
  | "Mobility"
  | "Pranayama"
  | "Custom";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  unit: ExerciseUnit;
  defaultSets: number;
  defaultQuantity: number;
  aliases?: string[];
  guidance?: string;
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  /** Snapshot the name and unit so history does not depend on the catalogue. */
  exerciseName: string;
  unit: ExerciseUnit;
  sets: number;
  quantity: number;
  day: string;
  at: string;
}

export type ExerciseMutation =
  | { id: string; kind: "exercise"; exercise: Exercise }
  | { id: string; kind: "entry"; entry: ExerciseEntry }
  | { id: string; kind: "delete"; entryId: string };

export interface ExerciseData {
  customExercises: Exercise[];
  entries: ExerciseEntry[];
  pending: ExerciseMutation[];
}

export const EMPTY_EXERCISE_DATA: ExerciseData = {
  customExercises: [],
  entries: [],
  pending: [],
};

function exercise(
  id: string,
  name: string,
  category: ExerciseCategory,
  unit: ExerciseUnit = "reps",
  aliases: string[] = [],
  guidance?: string,
): Exercise {
  return {
    id,
    name,
    category,
    unit,
    aliases,
    guidance,
    defaultSets: unit === "reps" ? 3 : 1,
    defaultQuantity: unit === "seconds" ? 30 : unit === "rounds" ? 1 : 10,
  };
}

/** Editable logging placeholders, not prescribed workouts. No equipment required. */
export const EXERCISES: Exercise[] = [
  exercise("squats", "Squats", "Strength", "reps", ["bodyweight squat"]),
  exercise("push-ups", "Push-ups", "Strength", "reps", [
    "pushups",
    "press ups",
  ]),
  exercise(
    "surya-namaskar",
    "Surya Namaskar",
    "Yoga",
    "rounds",
    ["sun salutation", "suryanamaskar"],
    "For this log, one 12-pose sequence counts as one round.",
  ),
  exercise(
    "lunges",
    "Lunges",
    "Strength",
    "reps",
    [],
    "Enter reps per side; complete the same count on each side.",
  ),
  exercise("plank", "Plank", "Core", "seconds"),
  exercise("jumping-jacks", "Jumping jacks", "Cardio"),
  exercise("sumo-squats", "Sumo squats", "Strength"),
  exercise("knee-push-ups", "Knee push-ups", "Strength", "reps", [
    "knee pushups",
  ]),
  exercise("glute-bridges", "Glute bridges", "Strength", "reps", [
    "hip bridge",
  ]),
  exercise("calf-raises", "Calf raises", "Strength"),
  exercise("wall-sit", "Wall sit", "Strength", "seconds"),
  exercise("crunches", "Crunches", "Core"),
  exercise("leg-raises", "Leg raises", "Core"),
  exercise("dead-bug", "Dead bug", "Core", "reps", [], "Enter reps per side."),
  exercise(
    "side-plank",
    "Side plank",
    "Core",
    "seconds",
    [],
    "Enter hold time per side.",
  ),
  exercise("high-knees", "High knees", "Cardio", "seconds"),
  exercise(
    "mountain-climbers",
    "Mountain climbers",
    "Cardio",
    "reps",
    [],
    "Each knee drive counts as one rep.",
  ),
  exercise("burpees", "Burpees", "Cardio"),
  exercise("marching", "Marching in place", "Cardio", "seconds"),
  exercise("tadasana", "Tadasana", "Yoga", "seconds", ["mountain pose"]),
  exercise(
    "vrikshasana",
    "Vrikshasana",
    "Yoga",
    "seconds",
    ["tree pose"],
    "Enter hold time per side.",
  ),
  exercise("bhujangasana", "Bhujangasana", "Yoga", "seconds", ["cobra pose"]),
  exercise("balasana", "Balasana", "Yoga", "seconds", [
    "child pose",
    "child's pose",
  ]),
  exercise("setu-bandhasana", "Setu Bandhasana", "Yoga", "seconds", [
    "bridge pose",
  ]),
  exercise("shavasana", "Shavasana", "Yoga", "seconds", [
    "savasana",
    "corpse pose",
  ]),
  exercise(
    "cat-cow",
    "Cat–cow",
    "Mobility",
    "reps",
    ["cat cow"],
    "One cat-and-cow movement counts as one rep.",
  ),
  exercise("shoulder-circles", "Shoulder circles", "Mobility", "reps", [
    "shoulder rolls",
  ]),
  exercise("hip-circles", "Hip circles", "Mobility"),
  exercise(
    "kapalbhati",
    "Kapalbhati",
    "Pranayama",
    "reps",
    ["kapalabhati", "skull shining breath"],
    "Log the number of exhalations per set.",
  ),
  exercise(
    "anulom-vilom",
    "Anulom Vilom",
    "Pranayama",
    "rounds",
    ["anuloma viloma", "alternate nostril breathing"],
    "For this log, one round includes a full breathing cycle on both sides.",
  ),
  exercise(
    "bhramari",
    "Bhramari",
    "Pranayama",
    "rounds",
    ["brahmari", "humming bee breath"],
    "One humming exhalation counts as one round.",
  ),
  exercise(
    "bhastrika",
    "Bhastrika",
    "Pranayama",
    "rounds",
    ["bellows breath"],
    "One inhale–exhale cycle counts as one round.",
  ),
];

/** Explicit IDs keep quick-log selection and order independent of the library. */
export const QUICK_EXERCISES: Exercise[] = [
  "jumping-jacks",
  "squats",
  "knee-push-ups",
  "surya-namaskar",
  "leg-raises",
  "mountain-climbers",
  "plank",
  "kapalbhati",
  "anulom-vilom",
].map((id) => {
  const item = EXERCISES.find((exercise) => exercise.id === id);
  if (!item) throw new Error(`Unknown quick-log exercise: ${id}`);
  return item;
});
export const UNIT_LABELS: Record<ExerciseUnit, string> = {
  reps: "reps",
  seconds: "seconds",
  rounds: "rounds",
};

export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function searchExercises(
  exercises: Exercise[],
  query: string,
): Exercise[] {
  const normalized = normalizeExerciseName(query);
  return exercises.filter((item) =>
    [item.name, item.category, ...(item.aliases ?? [])].some((text) =>
      normalizeExerciseName(text).includes(normalized),
    ),
  );
}

export function findExercise(
  exercises: Exercise[],
  name: string,
): Exercise | undefined {
  const normalized = normalizeExerciseName(name);
  return exercises.find((item) =>
    [item.name, ...(item.aliases ?? [])].some(
      (text) => normalizeExerciseName(text) === normalized,
    ),
  );
}

export function validExerciseValues(sets: number, quantity: number): boolean {
  return (
    Number.isInteger(sets) &&
    sets > 0 &&
    sets <= 100 &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= 86400
  );
}

export function validExerciseDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === day
  );
}

export function exercisePreset(
  exercise: Exercise,
  entries: ExerciseEntry[],
): { sets: number; quantity: number } {
  const last = entries
    .filter(
      (entry) =>
        entry.exerciseId === exercise.id && entry.unit === exercise.unit,
    )
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return last
    ? { sets: last.sets, quantity: last.quantity }
    : { sets: exercise.defaultSets, quantity: exercise.defaultQuantity };
}

export function formatExerciseValues(
  sets: number,
  quantity: number,
  unit: ExerciseUnit,
): string {
  return `${sets} × ${quantity} ${unit === "seconds" ? "sec" : unit}`;
}
