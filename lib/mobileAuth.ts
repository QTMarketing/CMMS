import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production";

export interface MobileUser {
  id: string;
  email: string;
  role: string;
  storeId?: string | null;
}

export function verifyMobileToken(request: NextRequest): MobileUser | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as MobileUser;
    return decoded;
  } catch (error) {
    return null;
  }
}




