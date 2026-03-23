import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../firebase";

type ActivityType =
  | "login"
  | "signup"
  | "message_sent"
  | "file_uploaded"
  | "file_created"
  | "review_submitted"
  | "invite_created"
  | "access_approved";

type ActivityPayload = {
  type: ActivityType;
  title: string;
  detail: string;
  metadata?: Record<string, unknown>;
};

export async function upsertUserPresence(user: User, extra?: Record<string, unknown>) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "Anonymous",
      email: user.email,
      photoURL: user.photoURL,
      status: "online",
      hasGithub: user.providerData.some((provider) => provider.providerId === "github.com"),
      hasGoogle: user.providerData.some((provider) => provider.providerId === "google.com"),
      lastActive: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      ...extra,
    },
    { merge: true }
  );
}

export async function logActivity(user: User, payload: ActivityPayload) {
  await addDoc(collection(db, "activity"), {
    type: payload.type,
    title: payload.title,
    detail: payload.detail,
    metadata: payload.metadata || {},
    createdAt: serverTimestamp(),
    userId: user.uid,
    userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
    userEmail: user.email || null,
    userPhotoURL: user.photoURL || null,
  });
}
