package com.hackathon.platform.chat;

public record ChatMessagePayload(
        String authorUid,
        String authorName,
        String authorPhotoURL,
        String type,
        String text,
        String mediaUrl,
        String previewUrl,
        String fileName,
        String mimeType,
        Long fileSize
) {
}
