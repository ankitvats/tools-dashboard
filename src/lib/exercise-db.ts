import { supabase } from "./supabase";
import type { Exercise, ExerciseEntry, ExerciseMutation } from "./exercises";

type Row = Record<string, unknown>;

async function fetchRows(
  table: "custom_exercises" | "exercise_entries",
  userId: string,
): Promise<Row[]> {
  const rows: Row[] = [];
  // Supabase caps a response at 1,000 rows; never truncate a user's daily history.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Could not load exercises.");
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function dbFetchExercises(
  userId: string,
): Promise<{ customExercises: Exercise[]; entries: ExerciseEntry[] }> {
  const [custom, entries] = await Promise.all([
    fetchRows("custom_exercises", userId),
    fetchRows("exercise_entries", userId),
  ]);
  return {
    customExercises: custom.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: "Custom",
      unit: row.unit as Exercise["unit"],
      defaultSets: 1,
      defaultQuantity:
        row.unit === "seconds" ? 30 : row.unit === "rounds" ? 1 : 10,
    })),
    entries: entries
      .map((row) => ({
        id: row.id as string,
        exerciseId: row.exercise_id as string,
        exerciseName: row.exercise_name as string,
        unit: row.unit as ExerciseEntry["unit"],
        sets: row.sets as number,
        quantity: row.quantity as number,
        day: row.day as string,
        at: row.at as string,
      }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  };
}

export async function dbApplyExerciseMutation(
  userId: string,
  mutation: ExerciseMutation,
): Promise<void> {
  let result;
  if (mutation.kind === "exercise") {
    const { exercise } = mutation;
    result = await supabase.from("custom_exercises").upsert(
      {
        user_id: userId,
        id: exercise.id,
        name: exercise.name,
        unit: exercise.unit,
      },
      { onConflict: "user_id,id" },
    );
  } else if (mutation.kind === "entry") {
    const { entry } = mutation;
    result = await supabase.from("exercise_entries").upsert(
      {
        user_id: userId,
        id: entry.id,
        exercise_id: entry.exerciseId,
        exercise_name: entry.exerciseName,
        unit: entry.unit,
        sets: entry.sets,
        quantity: entry.quantity,
        day: entry.day,
        at: entry.at,
      },
      { onConflict: "user_id,id" },
    );
  } else {
    result = await supabase
      .from("exercise_entries")
      .delete()
      .eq("user_id", userId)
      .eq("id", mutation.entryId);
  }
  if (result.error) throw new Error("Could not save exercises.");
}
