import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const generateInviteCode = () =>
  `invite-${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 6)}`;

export async function createWorkspaceInvite(user: User) {
  const code = generateInviteCode();

  await setDoc(doc(db, "workspaceInvites", code), {
    code,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: user.displayName || user.email?.split("@")[0] || "Admin",
    role: "developer",
    status: "active",
  });

  return code;
}

export async function submitJoinRequest(user: User, inviteCode: string) {
  const inviteRef = doc(db, "workspaceInvites", inviteCode);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error("This invite link is no longer valid.");
  }

  const invite = inviteSnap.data();
  if (invite.status !== "active") {
    throw new Error("This invite link has been disabled.");
  }

  const requestId = `${inviteCode}_${user.uid}`;
  await setDoc(
    doc(db, "workspaceJoinRequests", requestId),
    {
      requestId,
      inviteCode,
      inviteCreatedBy: invite.createdBy,
      role: invite.role || "developer",
      status: "pending",
      requestedAt: serverTimestamp(),
      userId: user.uid,
      userEmail: user.email || null,
      userName: user.displayName || user.email?.split("@")[0] || "Member",
      userPhotoURL: user.photoURL || null,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", user.uid),
    {
      membershipStatus: "pending",
      requestedInviteCode: inviteCode,
      requestedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function approveJoinRequest(requestId: string, userId: string, role = "developer") {
  await updateDoc(doc(db, "workspaceJoinRequests", requestId), {
    status: "approved",
    decidedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "users", userId),
    {
      membershipStatus: "approved",
      role,
      joinedWorkspaceAt: serverTimestamp(),
      requestedInviteCode: null,
    },
    { merge: true }
  );
}

export async function rejectJoinRequest(requestId: string, userId: string) {
  await updateDoc(doc(db, "workspaceJoinRequests", requestId), {
    status: "rejected",
    decidedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "users", userId),
    {
      membershipStatus: "rejected",
    },
    { merge: true }
  );
}

export async function createReviewRequest(user: User, fileId: string, fileName: string) {
  const reviewId = `${fileId}_${Date.now()}`;
  await setDoc(doc(db, "reviewRequests", reviewId), {
    reviewId,
    fileId,
    fileName,
    status: "pending",
    requestedAt: serverTimestamp(),
    requestedBy: user.uid,
    requestedByName: user.displayName || user.email?.split("@")[0] || "Member",
  });
}

export async function resolveReviewRequest(reviewId: string, status: "approved" | "changes_requested") {
  await updateDoc(doc(db, "reviewRequests", reviewId), {
    status,
    resolvedAt: serverTimestamp(),
  });
}
