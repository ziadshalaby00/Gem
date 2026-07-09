// DATA JS FILE
START_DATE = "22/6/2026";

const workoutData = {
    programs: [
        {
            id: "ppl",
            tabName: "Push / Pull / Legs",
            days: [
                {
                    day: "Day 1",
                    title: "Pull",
                    icon: "🏋️",
                    columns: ["Exercise", "Sets", "Reps / Time", "Max Weight (kg)"],
                    exercises: [["", "0", "0", 0]]
                },
                {
                    day: "Day 2",
                    title: "Push",
                    icon: "💥",
                    columns: ["Exercise", "Sets", "Reps / Time", "Max Weight (kg)"],
                    exercises: [["", "0", "0", 0]]
                },
                {
                    day: "Day 3",
                    title: "Legs",
                    icon: "🦵",
                    columns: ["Exercise", "Sets", "Reps / Time", "Max Weight (kg)"],
                    exercises: [["", "0", "0", 0]]
                }
            ]
        },
        {
            id: "home",
            tabName: "Home Workout",
            days: [
                {
                    day: "Day 1",
                    title: "Upper Body",
                    icon: "🏠",
                    columns: ["Exercise", "Sets", "Max Weight (kg)"],
                    exercises: [["", "0", "0"]]
                },
                {
                    day: "Day 2",
                    title: "Lower Body",
                    icon: "🔥",
                    columns: ["Exercise", "Sets", "Max Weight (kg)"],
                    exercises: [["", "0", "0"]]
                },
                {
                    day: "Day 3",
                    title: "Stretches & Flexibility",
                    icon: "🧘",
                    columns: ["Stretch", "Duration", "Targets / Execution"],
                    exercises: [["", "0", "0"]]
                }
            ]
        }
    ]
};



// ["Lat Pulldown", "3", "8-12", 0],
// ["Seated Cable Row OR T-Bar Row", "3", "8-12", 0],
// ["Hyperextensions (Lower Back)", "3", "12-15", 0],
// ["Reverse Pec Deck Fly (Rear Delts)", "3", "12-15", 0],
// ["Dumbbell Bicep Curls", "3", "8-12", 0],
// ["Cable Hammer Curls", "2", "10-12", 0],
// ["Dumbbell Shrugs (Traps)", "2", "10-12", 0],
// ["Dead Hang", "2", "45 sec", 0]

// ["Incline Bench Press", "3", "6-10", 0],
// ["Chest Fly Machine OR Seated Chest Press", "3", "8-12", 0],
// ["Machine Overhead Press", "2", "8-12", 0],
// ["Dumbbell Lateral Raises", "3", "12-15", 0],
// ["Triceps Pushdown (Cable)", "3", "10-12", 0],
// ["Overhead Triceps Extension (Cable)", "2", "10-12", 0],
// ["Bicycle Crunches", "3", "15-20", 0],
// ["Doorway Chest Stretch", "2", "30 sec", 0]

// ["Leg Press", "3", "8-12", 0],
// ["Romanian Deadlift", "3", "8-12", 0],
// ["Leg Extensions (Quad Machine)", "2", "10-12", 0],
// ["Seated/Lying Leg Curls (Hamstring Machine)", "2", "10-12", 0],
// ["Calf Raises (Machine)", "3", "12-15", 0],
// ["Pallof Press", "3", "12-15 => 1-3 sec", 0],
// ["Plank", "3", "30-60 sec", 0],
// ["Kneeling Hip Flexor Stretch", "1", "45 sec", 0]

// ["Push-ups", "3", 0],
// ["Backpack Rows", "3", 0],
// ["Backpack Overhead Press", "2", 0],
// ["Lateral Raises", "3", 0],
// ["Reverse Snow Angels", "3", 0],
// ["Bench/Chair Dips", "3", 0],
// ["Backpack Hammer Curls", "3", 0],
// ["Bicycle Crunches", "3", 0]

// ["Weighted Backpack Squats", "3", 0],
// ["Backpack Romanian Deadlifts (RDL)", "3", 0],
// ["Weighted Backpack Lunges", "2", 0],
// ["Superman Hold", "3", 0],
// ["Backpack Glute Bridges", "2", 0],
// ["Backpack Calf Raises", "3", 0],
// ["Plank", "3", 0]

// ["Kneeling Quad Stretch", "45 sec / leg", "Pull your back ankle toward your glutes to release the quads."],
// ["Seated Hamstring Stretch", "45 sec", "Sit down, reach forward with a flat back to stretch the hamstrings."],
// ["90/90 Stretch", "45 sec / side", "Opens up tight hips and glutes after lower body day."],
// ["Cobra Pose", "45 sec", "Decompresses the lumbar spine and stretches the abdominals."],
// ["Child's Pose", "45 sec", "Relaxes the entire spine, lats, and shoulders."],
// ["Doorway Chest Stretch", "45 sec", "Opens up tight chest muscles and anterior shoulders from push-ups."],
// ["Cross-Body Shoulder Stretch", "45 sec / arm", "Stretches the lateral and posterior deltoids."]