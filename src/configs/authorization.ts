/**
 * Define authorization spec
 */

const groups = ["admin", "student", "teacher"];

const roles = {
  admin: [
    "root",
    "editor", // manage articles and comments
    "keeper", // manage reservations and items
    "organizer", // manage contests, teams and announcements
    "counselor" // manage info
  ],
  student: [
    "default",
    "writer" // write articles
  ],
  teacher: ["default"]
};

export { groups, roles };
