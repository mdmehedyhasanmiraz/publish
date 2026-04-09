export function getRoleLandingPath(role?: string | null) {
  switch (role) {
    case "publisher_owner":
    case "publisher_admin":
    case "journal_manager":
    case "editor_in_chief":
    case "managing_editor":
    case "associate_editor":
    case "editorial_assistant":
    case "production_editor":
    case "copyeditor":
    case "typesetter":
      return "/dashboard/admin";
    case "reviewer":
      return "/dashboard/reviews";
    case "author":
      return "/dashboard/submissions";
    default:
      return "/dashboard";
  }
}
