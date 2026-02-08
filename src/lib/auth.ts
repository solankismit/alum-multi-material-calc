import bcrypt from "bcryptjs";

export function saltAndHashPassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, hash: string) {
    return bcrypt.compareSync(password, hash);
}
