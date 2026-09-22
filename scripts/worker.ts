import { tickTasks } from "../lib/store";
console.log(
  "Reminder worker running. Due reminders are stored durably; open the app to view them.",
);
const tick = () => {
  try {
    tickTasks();
  } catch (e) {
    console.error("Reminder worker:", e);
  }
};
tick();
const timer = setInterval(tick, 1000);
for (const s of ["SIGTERM", "SIGINT"] as const)
  process.once(s, () => {
    clearInterval(timer);
    process.exit(0);
  });
