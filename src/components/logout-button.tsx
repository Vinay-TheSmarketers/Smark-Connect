"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return <button className="icon-button" type="button" onClick={() => signOut({ redirectTo: "/login" })} aria-label="Sign out">↗</button>;
}
