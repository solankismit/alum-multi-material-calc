import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secretKey = process.env.AUTH_SECRET;
const key = new TextEncoder().encode(secretKey);

const COOKIE_NAME = "session";

// 7 days in ms
const EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

export async function encrypt(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
}

export async function decrypt(session: string | undefined = "") {
    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function createSession(userId: string, role: string) {
    const expires = new Date(Date.now() + EXPIRATION_TIME);
    const session = await encrypt({ userId, role, expires });

    (await cookies()).set(COOKIE_NAME, session, {
        httpOnly: true,
        secure: true,
        expires,
        sameSite: "lax",
        path: "/",
    });
}

export async function verifySession() {
    const cookie = (await cookies()).get(COOKIE_NAME)?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
        redirect("/login");
    }

    return { isAuth: true, userId: session.userId as string, role: session.role as string };
}

export async function updateSession() {
    const session = (await cookies()).get(COOKIE_NAME)?.value;
    const payload = await decrypt(session);

    if (!session || !payload) {
        return null;
    }

    const expires = new Date(Date.now() + EXPIRATION_TIME);
    (await cookies()).set(COOKIE_NAME, session, {
        httpOnly: true,
        secure: true,
        expires,
        sameSite: "lax",
        path: "/",
    });
}

export async function deleteSession() {
    (await cookies()).delete(COOKIE_NAME);
}

export async function getSession() {
    const cookie = (await cookies()).get(COOKIE_NAME)?.value;
    const session = await decrypt(cookie);
    return session;
}
