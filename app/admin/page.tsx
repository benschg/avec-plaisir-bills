"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireAuth } from "@/components/require-auth";

type Role = "admin" | "editor" | "viewer" | "no_access";

interface AppUser {
  email: string;
  role: Role;
  created_at: string;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Betrachter",
  no_access: "Kein Zugang",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-800",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
  no_access: "bg-yellow-100 text-yellow-800",
};

export default function AdminPage() {
  return (
    <RequireAuth minRole="admin">
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      setError("Kein Zugriff. Nur Administratoren können Benutzer verwalten.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (data.success) setUsers(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addUser = async () => {
    if (!newEmail.trim()) return;
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
    });
    const data = await res.json();
    if (data.success) {
      setNewEmail("");
      fetchUsers();
    } else {
      setError(data.error);
    }
  };

  const updateRole = async (email: string, role: Role) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (data.success) fetchUsers();
  };

  const removeUser = async (email: string) => {
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) fetchUsers();
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground text-sm">Laden...</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benutzerverwaltung</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Benutzer und deren Rollen verwalten
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="E-Mail-Adresse"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addUser()}
          className="flex-1"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as Role)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="no_access">Kein Zugang</option>
          <option value="viewer">Betrachter</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <Button onClick={addUser}>Hinzufuegen</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">E-Mail</th>
              <th className="text-left px-4 py-2 font-medium">Rolle</th>
              <th className="text-left px-4 py-2 font-medium">Erstellt</th>
              <th className="text-right px-4 py-2 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-t">
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.email, e.target.value as Role)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[user.role]}`}
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("de-CH")}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeUser(user.email)}
                  >
                    Entfernen
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Keine Benutzer vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
