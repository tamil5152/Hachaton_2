package com.hackathon.platform.chat;

import java.time.Instant;

public record ChatMessageResponse(
        String id,
        String authorUid,
        String authorName,
        String authorPhotoURL,
        String type,
        String text,
        String mediaUrl,
        String previewUrl,
        String fileName,
        String mimeType,
        Long fileSize,
        Instant createdAt
) {
}
