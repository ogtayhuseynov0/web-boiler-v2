import { redirect } from "next/navigation";

// With Google OAuth, signup is handled automatically on first login
// Redirect to login page
export default function SignupPage() {
  redirect("/login");
}
