import { NextResponse } from "next/server";

export function middleware(request) {
    // Only apply CORS to api routes
    if (request.nextUrl.pathname.startsWith("/api")) {
        const response = NextResponse.next();

        // Set CORS headers
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        // Handle preflight requests
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 204,
                headers: response.headers,
            });
        }

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
