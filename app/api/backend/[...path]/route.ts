import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const configuredApiUrl =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

  let destination: URL;
  try {
    const baseUrl = new URL(configuredApiUrl);
    if (!["http:", "https:"].includes(baseUrl.protocol)) {
      throw new Error("The backend URL must use HTTP or HTTPS.");
    }

    const { path } = await context.params;
    destination = new URL(
      `/${path.map((segment) => encodeURIComponent(segment)).join("/")}${request.nextUrl.search}`,
      `${baseUrl.origin}/`,
    );
  } catch (error) {
    console.error("Backend API proxy configuration error:", error);
    return Response.json(
      { message: "Backend API URL is invalid. Set BACKEND_API_URL to the backend HTTP(S) origin." },
      { status: 503 },
    );
  }

  const headers = new Headers(request.headers);
  for (const header of hopByHopHeaders) headers.delete(header);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.body && request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(destination, init);
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (name !== "set-cookie" && !hopByHopHeaders.has(name)) {
        responseHeaders.set(name, value);
      }
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(
      upstream.status === 204 || upstream.status === 304 ? null : upstream.body,
      {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error("Backend API proxy request failed:", error);
    return Response.json(
      { message: "Backend API is unavailable. Check BACKEND_API_URL and the backend service status." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
