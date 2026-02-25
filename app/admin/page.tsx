"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";
import AppShell from "@/components/AppShell";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const role = (session?.user as any)?.role;

  const [users, setUsers] = useState<any[]>([]);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "CLIENT" });
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (role !== "ADMIN") { router.push("/dashboard"); return; }
    loadUsers();
    loadConfig();
  }, [role]);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function loadConfig() {
    const res = await fetch("/api/admin/config");
    if (res.ok) setConfig(await res.json());
  }

  async function createUser() {
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setCreating(false);
    if (res.ok) {
      toast.current?.show({ severity: "success", summary: "User created", life: 3000 });
      setShowNewUser(false);
      setNewUser({ name: "", email: "", password: "", role: "CLIENT" });
      loadUsers();
    } else {
      const err = await res.json();
      toast.current?.show({ severity: "error", summary: "Error", detail: err.error, life: 4000 });
    }
  }

  async function saveConfig() {
    setSavingConfig(true);
    await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSavingConfig(false);
    toast.current?.show({ severity: "success", summary: "Settings saved", life: 3000 });
  }

  return (
    <AppShell>
      <Toast ref={toast} />
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <TabView>
        {/* Users Tab */}
        <TabPanel header="Users" leftIcon="pi pi-users mr-2">
          <div className="flex justify-content-end mb-3">
            <Button label="Add User" icon="pi pi-plus" onClick={() => setShowNewUser(true)} />
          </div>
          <DataTable value={users} stripedRows>
            <Column field="id" header="#" style={{ width: "60px" }} />
            <Column field="name" header="Name" />
            <Column field="email" header="Email" />
            <Column header="Role" body={(r) => (
              <Tag value={r.role}
                severity={r.role === "ADMIN" ? "danger" : r.role === "DEVELOPER" ? "info" : "secondary"} />
            )} />
            <Column header="Created" body={(r) => new Date(r.createdAt).toLocaleDateString()} />
          </DataTable>

          <Dialog header="Add User" visible={showNewUser}
            onHide={() => setShowNewUser(false)} style={{ width: "400px" }}>
            <div className="flex flex-column gap-3">
              <div className="flex flex-column gap-1">
                <label>Full Name</label>
                <InputText value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </div>
              <div className="flex flex-column gap-1">
                <label>Email</label>
                <InputText type="email" value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className="flex flex-column gap-1">
                <label>Password</label>
                <Password value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  feedback={false} toggleMask />
              </div>
              <div className="flex flex-column gap-1">
                <label>Role</label>
                <Dropdown value={newUser.role}
                  options={[
                    { label: "Client", value: "CLIENT" },
                    { label: "Developer", value: "DEVELOPER" },
                    { label: "Admin", value: "ADMIN" },
                    { label: "Manager", value: "MANAGER" },
                  ]}
                  onChange={(e) => setNewUser({ ...newUser, role: e.value })} />
              </div>
              <Button label="Create User" loading={creating} onClick={createUser} />
            </div>
          </Dialog>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel header="Settings" leftIcon="pi pi-cog mr-2">
          <Message severity="info" text="Settings are stored in the database. Restart is not required." className="mb-4 w-full" />
          <div className="grid">
            <div className="col-12">
              <h3 className="text-lg font-semibold">Email (SMTP)</h3>
            </div>
            {[
              { key: "smtp_host", label: "SMTP Host" },
              { key: "smtp_port", label: "SMTP Port" },
              { key: "smtp_user", label: "SMTP Username" },
              { key: "smtp_from", label: "From Email Address" },
            ].map(({ key, label }) => (
              <div key={key} className="col-12 md:col-6 flex flex-column gap-1">
                <label>{label}</label>
                <InputText value={config[key] || ""}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-12 mt-3">
              <h3 className="text-lg font-semibold">Bitbucket</h3>
            </div>
            {[
              { key: "bitbucket_workspace", label: "Workspace Slug" },
              { key: "bitbucket_repo", label: "Repository Slug" },
            ].map(({ key, label }) => (
              <div key={key} className="col-12 md:col-6 flex flex-column gap-1">
                <label>{label}</label>
                <InputText value={config[key] || ""}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-12 mt-3">
              <Button label="Save Settings" icon="pi pi-save"
                loading={savingConfig} onClick={saveConfig} />
            </div>
          </div>
        </TabPanel>
      </TabView>
    </AppShell>
  );
}
