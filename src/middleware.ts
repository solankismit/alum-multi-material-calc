import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

const protectedRoutes = ["/dashboard", "/admin"];
const publicRoutes = ["/login", "/register", "/"];

export default async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some((route) =>
        path.startsWith(route)
    );
    const isPublicRoute = publicRoutes.includes(path);

    const cookie = (await cookies()).get("session")?.value;
    const session = await decrypt(cookie);

    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    // Redirect logic removed to allow authenticated users to access the home page (calculator)
    // if (
    //     isPublicRoute &&
    //     session?.userId &&
    //     !req.nextUrl.pathname.startsWith("/dashboard")
    // ) {
    //     return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    // }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
