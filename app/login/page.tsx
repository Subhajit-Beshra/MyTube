"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
    loginUser,
    registerUser,
    googleLoginUser,
    resendEmailOtp,
    verifyEmailOtp,
} from "@/lib/auth";
import { useEffect } from "react";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: {
                            credential: string;
                        }) => void;
                    }) => void;
                    renderButton: (
                        element: HTMLElement,
                        options: {
                            theme: string;
                            size: string;
                            shape: string;
                            text: string;
                            width: number;
                        }
                    ) => void;
                };
            };
        };
    }
}

export default function LoginPage() {
    const { refreshUser } = useAuth();
    const router = useRouter();

    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [challengeId, setChallengeId] = useState("");
    const [challengeEmail, setChallengeEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resendSeconds, setResendSeconds] = useState(0);
    const [otpNotice, setOtpNotice] = useState("");

    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!challengeId) return;
        const timer = window.setInterval(() => {
            setResendSeconds((remaining) => Math.max(remaining - 1, 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [challengeId]);

    const googleButtonRef = useRef<HTMLDivElement>(null);

    function showOtpChallenge(response: {
        requiresOtp?: boolean;
        challengeId?: string;
        maskedEmail?: string;
    }) {
        if (!response.requiresOtp || !response.challengeId) return false;
        setChallengeId(response.challengeId);
        setChallengeEmail(response.maskedEmail ?? "");
        setOtp("");
        setOtpNotice("");
        setResendSeconds(60);
        return true;
    }

    async function handleGoogleCredential(credential: string) {
        setError("");
        setLoading(true);

        try {
            const response = await googleLoginUser(credential);
            if (showOtpChallenge(response)) return;
            await refreshUser();
            router.push("/");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Google sign-in failed."
            );
        } finally {
            setLoading(false);
        }
    }

    function initializeGoogle() {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!clientId || !window.google || !googleButtonRef.current) {
            setError("Google sign-in could not be initialized. Check your configuration.");
            return;
        }

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
                if (response.credential) {
                    void handleGoogleCredential(response.credential);
                } else {
                    setError("Google did not return a credential.");
                }
            },
        });

        googleButtonRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(
            googleButtonRef.current,
            {
                theme: "outline",
                size: "large",
                shape: "pill",
                text: "continue_with",
                width: 320,
            }
        );
    }


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = isRegister
                ? await registerUser(name, email, password)
                : await loginUser(email, password);
            if (showOtpChallenge(response)) return;

            await refreshUser();

            router.push("/");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!challengeId) return;
        setError("");
        setLoading(true);
        try {
            await verifyEmailOtp(challengeId, otp);
            await refreshUser();
            router.push("/");
            router.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not verify the code.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResendOtp() {
        if (!challengeId || resendSeconds > 0) return;
        setError("");
        setLoading(true);
        try {
            const response = await resendEmailOtp(challengeId);
            setError("");
            setOtpNotice(response.message ?? "A new verification code was sent.");
            setResendSeconds(60);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not resend the verification code.");
        } finally {
            setLoading(false);
        }
    }


    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-200 via-[#f5f6fa] to-sky-200 px-4 text-slate-900">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                <Link href="/" className="mb-8 block text-2xl font-bold">
                    <span className="text-red-500">My</span>Tube
                </Link>

                <h1 className="text-2xl font-bold">
                    {challengeId ? "Verify your email" : isRegister ? "Create your account" : "Welcome back"}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    {challengeId
                        ? `Enter the 6-digit code sent to ${challengeEmail}.`
                        : isRegister
                            ? "Join MyTube and create your channel."
                            : "Log in to continue to MyTube."}
                </p>

                {challengeId ? (
                    <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="otp" className="mb-2 block text-sm">Email verification code</label>
                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-indigo-500"
                                placeholder="000000"
                            />
                        </div>
                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                        {otpNotice && <p role="status" className="text-sm text-emerald-700">{otpNotice}</p>}
                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="w-full rounded-full bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Verifying…" : "Verify and sign in"}
                        </button>
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                disabled={loading || resendSeconds > 0}
                                onClick={() => void handleResendOtp()}
                                className="font-semibold text-indigo-700 underline disabled:text-slate-400"
                            >
                                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                    setChallengeId("");
                                    setChallengeEmail("");
                                    setOtp("");
                                    setError("");
                                    setOtpNotice("");
                                }}
                                className="text-slate-600 underline"
                            >
                                Back to sign in
                            </button>
                        </div>
                    </form>
                ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {isRegister && (
                        <div>
                            <label htmlFor="name" className="mb-2 block text-sm">
                                Your name
                            </label>
                            <input
                                id="name"
                                type="text"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                                placeholder="Enter your name"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            minLength={isRegister ? 8 : undefined}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                            placeholder={isRegister ? "At least 8 characters" : "Your password"}
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-full bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading
                            ? "Please wait..."
                            : isRegister
                                ? "Create account"
                                : "Log in"}
                    </button>
                </form>
                )}

                {!challengeId && <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-500">OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>}

                {/* <button
                    type="button"
                    onClick={() =>
                        setError("Google sign-in will be connected in the next step.")
                    }
                    className="w-full rounded-full border border-slate-300 py-3 font-medium transition hover:bg-slate-50"
                >
                    Continue with Google
                </button> */}
                {!challengeId && <Script
                    src="https://accounts.google.com/gsi/client"
                    strategy="afterInteractive"
                    onLoad={initializeGoogle}
                />}

                {!challengeId && <div className="flex min-h-10 justify-center">
                    <div ref={googleButtonRef} />
                </div>}

                {!challengeId && <p className="mt-6 text-center text-sm text-slate-500">
                    {isRegister ? "Already have an account?" : "New to MyTube?"}{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                        }}
                        className="font-semibold text-indigo-700 underline underline-offset-4"
                    >
                        {isRegister ? "Log in" : "Create account"}
                    </button>
                </p>}
            </div>
        </main>
    );
}
