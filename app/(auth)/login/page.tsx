"use client";
import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import styles from "./login.module.css";

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
    <div className={styles.bg}>
      <Toast ref={toast} />
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>
            <i className="pi pi-ticket" />
          </div>
          <h1 className={styles.title}>Ticket System</h1>
          <p className={styles.subtitle}>Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <div className={styles.inputWrap}>
              <InputText
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <Password
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                feedback={false}
                toggleMask
                required
                inputClassName="w-full"
              />
            </div>
          </div>

          <Button
            type="submit"
            label="Sign In"
            icon="pi pi-arrow-right"
            iconPos="right"
            loading={loading}
            className={styles.btn}
          />
        </form>

        <p className={styles.footer}>
          © {new Date().getFullYear()} Smart4Solutions · All rights reserved
        </p>
      </div>
    </div>
  );
}
