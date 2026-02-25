"use client";
import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";

export default function LoginPage() {
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.current?.show({
        severity: "error",
        summary: "Login failed",
        detail: "Invalid email or password",
        life: 3000,
      });
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", background: "var(--surface-ground)" }}
    >
      <Toast ref={toast} />
      <Card
        title="Ticket System"
        subTitle="Sign in to continue"
        style={{ width: "380px" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-column gap-3">
          <div className="flex flex-column gap-2">
            <label htmlFor="email">Email</label>
            <InputText
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
              autoComplete="email"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="password">Password</label>
            <Password
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              feedback={false}
              toggleMask
              required
              className="w-full"
              inputClassName="w-full"
            />
          </div>
          <Button
            type="submit"
            label="Sign In"
            icon="pi pi-sign-in"
            loading={loading}
            className="w-full mt-2"
          />
        </form>
      </Card>
    </div>
  );
}
